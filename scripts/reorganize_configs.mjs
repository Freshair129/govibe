import fs from 'node:fs/promises';
import path from 'node:path';

const SRC_DIR = path.join(process.cwd(), 'model_configs');
const DEST_DIR = path.join(process.cwd(), 'local_model');

async function run() {
  await fs.mkdir(DEST_DIR, { recursive: true });
  
  const files = await fs.readdir(SRC_DIR);
  for (const file of files) {
    if (!file.endsWith('.yaml')) continue;
    
    const filePath = path.join(SRC_DIR, file);
    const content = await fs.readFile(filePath, 'utf8');
    
    // Parse tag and display_name safely
    const tagMatch = content.match(/model_tag:\s*"([^"]+)"/);
    const nameMatch = content.match(/display_name:\s*"([^"]+)"/);
    
    if (tagMatch) {
      const tag = tagMatch[1];
      const displayName = nameMatch ? nameMatch[1] : tag.split(':')[0];
      
      // Sanitizing model name
      let modelName = displayName.replace(/[^a-zA-Z0-9-]/g, '_').toLowerCase();
      
      // Parse Quantization or version tag
      const parts = tag.split(':');
      let qTag = parts.length > 1 ? parts[1] : 'latest';
      qTag = qTag.replace(/[^a-zA-Z0-9-]/g, '_').toUpperCase();
      
      const newModelDir = path.join(DEST_DIR, modelName, qTag);
      await fs.mkdir(newModelDir, { recursive: true });
      
      // The filename should be <modelname>_config.yaml
      const newFileName = `${modelName}_config.yaml`;
      const newFilePath = path.join(newModelDir, newFileName);
      
      await fs.rename(filePath, newFilePath);
      console.log(`Moved: ${file} -> local_model/${modelName}/${qTag}/${newFileName}`);
    } else {
        // Fallback for models without model_tag
        const newModelDir = path.join(DEST_DIR, 'unknown', 'unknown');
        await fs.mkdir(newModelDir, { recursive: true });
        await fs.rename(filePath, path.join(newModelDir, file));
        console.log(`Moved: ${file} -> local_model/unknown/unknown/${file}`);
    }
  }
  console.log('Reorganization complete.');
}

run().catch(console.error);
