import { pathToFileURL } from 'node:url';
process.chdir('C:\\Users\\erich\\HeadyMe\\frontend');
await import(pathToFileURL('C:\\Users\\erich\\HeadyMe\\frontend\\node_modules\\vite\\bin\\vite.js').href);
