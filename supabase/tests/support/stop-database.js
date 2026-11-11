import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

export async function stopDatabase(server, directory) {
  // Register the package's exit listener first. On Windows, pg_ctl provides a
  // graceful shutdown if the package's taskkill command cannot stop the cluster.
  const stopped = server.stop();
  if (process.platform === 'win32') {
    const {pg_ctl} = await import('@embedded-postgres/windows-x64');
    try {
      await promisify(execFile)(pg_ctl, ['-D', directory, '-m', 'fast', '-w', 'stop'],
        {windowsHide:true,timeout:30000});
    } catch (error) {
      // taskkill may win the race and the package may already remove the
      // temporary cluster before pg_ctl examines it.
      if (!/does not exist|not running|not a database cluster directory/i.test(error.stderr || '')) throw error;
    }
  }
  await stopped;
}
