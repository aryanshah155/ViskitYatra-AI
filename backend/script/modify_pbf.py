import osmium
import sys
import json

class RouteModifier(osmium.SimpleHandler):
    def __init__(self, target_ids, writer):
        super(RouteModifier, self).__init__()
        self.target_ids = set(target_ids)
        self.writer = writer

    def node(self, n):
        self.writer.add_node(n)

    def relation(self, r):
        self.writer.add_relation(r)

    def way(self, w):
        if w.id in self.target_ids:
            # We must create a new feature to modify tags
            new_tags = dict(w.tags)
            new_tags['highway'] = 'construction'
            new_tags['access'] = 'no'
            
            # The replace method constructs a new Way
            w = w.replace(tags=new_tags)
            print(f"Modified way {w.id} -> highway=construction")
            
        self.writer.add_way(w)

def main():
    if len(sys.argv) < 4:
        print("Usage: python modify_pbf.py <osm_ids.json> <input.pbf> <output.pbf>")
        sys.exit(1)

    ids_file = sys.argv[1]
    input_file = sys.argv[2]
    output_file = sys.argv[3]

    with open(ids_file, 'r') as f:
        osm_ids = json.load(f)

    print(f"Initializing Osmium modifier for {len(osm_ids)} IDs...")

    # Open the output file for writing
    writer = osmium.SimpleWriter(output_file)
    handler = RouteModifier(osm_ids, writer)

    # Process input file
    handler.apply_file(input_file)
    writer.close()

    print(f"Successfully generated modified PBF: {output_file}")

if __name__ == '__main__':
    main()
