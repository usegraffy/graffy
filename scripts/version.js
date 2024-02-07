import { git } from './utils.js';

export default async function version(str) {
  switch (str) {
    case 'major':
    case 'minor':
    case 'patch':
    case 'alpha':
    case 'beta':
      break;
    default:
      return str;
  }

  try {
    const { stdout } = await git('tag');

    const [major = 0, minor = 0, patch = 0, pre = '', number = 0] = stdout
      .split('\n')
      .reduce((latest, vstring) => {
        const version = vstring
          .split(/[.-]/)
          .map((seg, i) => (i === 3 ? seg : parseInt(seg)));

        for (let i = 0; i < 5; i++) {
          const atPre = i === 3;
          if (latest.length === i) return atPre ? latest : version;
          if (version.length === i) return atPre ? version : latest;
          if (latest[i] > version[i]) return latest;
          if (latest[i] < version[i]) return version;
        }
        return latest;
      }, []);

    switch (str) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + (pre ? 0 : 1)}`;
      case 'alpha':
      case 'beta':
        return `${major}.${minor}.${patch + (pre && str >= pre ? 0 : 1)}-${
          str > pre ? `${str}.1` : `${pre}.${number + 1}`
        }`;
    }
  } catch (e) {
    console.error('ERROR incrementing version');
    console.error(e);
  }
}
