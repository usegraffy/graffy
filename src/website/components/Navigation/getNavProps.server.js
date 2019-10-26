import fs from 'fs';
import path from 'path';

function getContent(name) {
  // console.log(path.join(__dirroot, 'pages', name));
  return fs.readdirSync(path.join(__dirroot, 'pages', name)).map(filename => {
    const url = filename.substr(0, filename.length - 3);
    const title = url[3].toUpperCase() + url.substr(4);
    return { title, url: `/${name}/${url}` };
  });
}

export default () => {
  return {
    menu: [
      { title: 'Home', url: '/' },
      { title: 'Learn', url: '#l', children: getContent('learn') },
      { title: 'Recipes', url: '#p', children: getContent('recipes') },
      { title: 'Theory', url: '#t', children: getContent('theory') },
      { title: 'Reference', url: '#r', children: getContent('reference') },
    ],
  };
};
