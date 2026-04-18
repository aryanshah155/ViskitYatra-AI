const fs = require('fs');
const { Client } = require('pg');
const { spawn } = require('child_process');
const path = require('path');

// Configuration
const ROAD_JSON_PATH = path.join(__dirname, 'road.json');
const OSM_IDS_PATH = path.join(__dirname, 'osm_ids.json');
const PYTHON_SCRIPT_PATH = path.join(__dirname, 'modify_pbf.py');
const PBF_BASE_DIR = path.join(__dirname, '../../../Map');
const PBF_INPUT = path.join(PBF_BASE_DIR, 'western-zone-260313.osm.pbf');
const PBF_BACKUP = path.join(PBF_BASE_DIR, 'western-zone-260313.osm.backup.pbf');
const PBF_OUTPUT = path.join(__dirname, 'temp.pbf'); // Write locally first to completely bypass cross-partition/drive issues

const OSRM_CONTAINERS = ['viksityatra_osrm_car', 'viksityatra_osrm_foot', 'viksityatra_osrm_bike'];

// Database Credentials
const DB_CONFIG = {
  user: process.env.DB_USER || 'viksityatra',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'viksityatra_db',
};

async function logTiming(message, action) {
  console.log(`[${new Date().toISOString()}] STARTED: ${message}`);
  const start = Date.now();
  const result = await action();
  const duration = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`[${new Date().toISOString()}] FINISHED: ${message} (Took ${duration}s)\n`);
  return result;
}

// Step 1: Parse Local Data
async function parseLocalData() {
  const content = fs.readFileSync(ROAD_JSON_PATH, 'utf8');
  const data = JSON.parse(content);
  
  const inProgressFeatures = [];
  
  if (data.features) {
    data.features.forEach(feature => {
      if (feature.properties && feature.properties.location && feature.properties.location.status === "In Progress") {
        if (feature.geometry && feature.geometry.type === 'MultiLineString') {
          inProgressFeatures.push(feature);
        } else if (feature.geometry && feature.geometry.type === 'LineString') {
          // Convert LineString to MultiLineString for consistency
          feature.geometry.type = 'MultiLineString';
          feature.geometry.coordinates = [feature.geometry.coordinates];
          inProgressFeatures.push(feature);
        }
      }
    });
  }
  
  console.log(`Found ${inProgressFeatures.length} "In Progress" features.`);
  return inProgressFeatures;
}

// Step 2: PostGIS Map Matching
async function matchWithPostGIS(features) {
  const client = new Client(DB_CONFIG);
  await client.connect();
  
  const matchedOsmIds = new Set();
  
  for (const feature of features) {
    // 0.00015 degrees is roughly 15 meters
    const query = `
      SELECT osm_id 
      FROM planet_osm_line 
      WHERE ST_DWithin(
        way, 
        ST_SetSRID(ST_GeomFromGeoJSON($1), 4326), 
        0.00015
      );
    `;
    
    const res = await client.query(query, [JSON.stringify(feature.geometry)]);
    res.rows.forEach(row => matchedOsmIds.add(row.osm_id));
  }
  
  await client.end();
  
  const uniqueIds = Array.from(matchedOsmIds);
  console.log(`Matched to ${uniqueIds.length} unique OSM IDs.`);
  
  // Save to file for Python script
  fs.writeFileSync(OSM_IDS_PATH, JSON.stringify(uniqueIds));
  return uniqueIds;
}

// Step 3: Python PBF Modification
async function modifyPbf() {
  if (!fs.existsSync(PBF_BACKUP) && fs.existsSync(PBF_INPUT)) {
    console.log('Creating backup of original PBF map before modifying...');
    fs.copyFileSync(PBF_INPUT, PBF_BACKUP);
  } else if (!fs.existsSync(PBF_INPUT)) {
    // If input goes missing but backup exists, restore it holding the base map logic
    if (fs.existsSync(PBF_BACKUP)) {
       console.log('Restoring PBF from backup cache...');
       fs.copyFileSync(PBF_BACKUP, PBF_INPUT);
    }
  }

  return new Promise((resolve, reject) => {
    // We pass the BACKUP file as input to Osmium, and tell it to cleanly overwrite the INPUT file
    const pythonProcess = spawn('python', [
      PYTHON_SCRIPT_PATH,
      OSM_IDS_PATH,
      PBF_BACKUP, // ALWAYS source from the clean backup
      PBF_OUTPUT
    ]);

    pythonProcess.stdout.on('data', (data) => console.log(`[Osmium]: ${data}`));
    pythonProcess.stderr.on('data', (data) => console.error(`[Osmium Warning]: ${data}`));

    pythonProcess.on('close', (code) => {
      if (code !== 0) return reject(new Error(`Python script exited with code ${code}`));
      
      // Manually copy the processed file over the original to avoid Osmium's Windows temp drive issue
      console.log('Overwriting original map safely...');
      try {
        fs.renameSync(PBF_OUTPUT, PBF_INPUT);
      } catch (e) {
        // Fallback to copy/delete if rename fails across drives
        fs.copyFileSync(PBF_OUTPUT, PBF_INPUT);
        fs.unlinkSync(PBF_OUTPUT);
      }
      resolve();
    });
  });
}

// Step 4: OSRM Graph Rebuild
async function rebuildOSRM() {
  return new Promise((resolve, reject) => {
    // We execute the compilation strictly from within an already running OSRM container using docker exec.
    // Since osrm_car has the osrm-backend tools, we can pipe the rebuild script over there.
    const compilerCmd = `docker exec viksityatra_osrm_car /bin/sh -c "
      for profile in car foot bicycle; do
        echo 'Rebuilding '$profile' routing index...'
        rm -rf /data/$profile
        mkdir -p /data/$profile
        osrm-extract -p /opt/$profile.lua /data/western-zone-260313.osm.pbf
        osrm-partition /data/western-zone-260313.osrm
        osrm-customize /data/western-zone-260313.osrm
        mv /data/western-zone-260313.osrm* /data/$profile/
      done
    "`;

    console.log(`Instructing OSRM cluster to aggressively compile the dynamic path maps...`);
    const buildProc = spawn(compilerCmd, { shell: true });
    
    buildProc.stdout.on('data', (data) => process.stdout.write(`[OSRM Build] ${data}`));
    buildProc.stderr.on('data', (data) => process.stderr.write(`[OSRM Build] ${data}`));
    
    buildProc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`OSRM compilation failed with code ${code}`));
      
      console.log(`Hard rebooting all worker containers to align indexes...`);
      const restartCmd = `docker restart ${OSRM_CONTAINERS.join(' ')}`;
      const restartProc = spawn(restartCmd, { shell: true });
      
      restartProc.on('close', (rc) => {
        if (rc !== 0) return reject(new Error(`OSRM cluster restart failed: code ${rc}`));
        console.log(`OSRM Cluster back online. Maps are actively shunning construction zones.`);
        resolve();
      });
    });
  });
}

// Step 5: Orchestration
async function runPipeline() {
  try {
    console.log("=== Starting Graph Update Pipeline ===\n");
    
    const features = await logTiming("Parsing local road JSON data", parseLocalData);
    
    if (features.length === 0) {
      console.log("No 'In Progress' features found. Exiting pipeline.");
      return;
    }
    
    await logTiming("Connecting to PostGIS and matching vectors", () => matchWithPostGIS(features));
    
    await logTiming("Modifying OSM PBF with Osmium", modifyPbf);
    
    await logTiming("Rebuilding OSRM Routing Index & Restarting Worker Cluster", rebuildOSRM);
    
    console.log("=== Pipeline Finished Successfully ===");
    
  } catch (error) {
    console.error("Pipeline Failed:", error);
    process.exit(1);
  }
}

runPipeline();
