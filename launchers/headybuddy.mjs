import { pathToFileURL } from 'node:url';
process.chdir('C:\\Users\\erich\\HeadyMe\\headybuddy');
await import(pathToFileURL('C:\\Users\\erich\\HeadyMe\\headybuddy\\node_modules\\vite\\bin\\vite.js').href);
