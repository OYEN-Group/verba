const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('schema.json', 'utf8'));

const extractTables = () => {
  const definitions = schema.definitions || {};
  for (const [tableName, def] of Object.entries(definitions)) {
    console.log(`\nTable: ${tableName}`);
    if (def.properties) {
      for (const [propName, propDef] of Object.entries(def.properties)) {
        let type = propDef.type || 'unknown';
        if (propDef.format) type += ` (${propDef.format})`;
        console.log(`  - ${propName}: ${type}`);
      }
    }
  }
};

extractTables();
