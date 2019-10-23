import fs from 'fs';
import path from 'path';

export default () => {
  console.log('dirname', __dirname);
  return {
    menu: fs.readdirSync(path.join(__dirname, '../public/learn')),
  };
};
