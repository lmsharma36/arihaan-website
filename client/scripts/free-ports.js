const { execSync } = require("child_process");

const PORT_RELEASE_TIMEOUT_MS = 10000;
const PORT_RELEASE_POLL_MS = 250;

const ports = process.argv
  .slice(2)
  .map((value) => Number.parseInt(value, 10))
  .filter((value) => Number.isFinite(value) && value > 0);

if (ports.length === 0) {
  console.log("No ports provided. Skipping port cleanup.");
  process.exit(0);
}

if (process.platform !== "win32") {
  console.log("Port cleanup script currently targets Windows only. Skipping.");
  process.exit(0);
}

const getListeningPids = (port) => {
  try {
    const output = execSync(`netstat -ano -p tcp | findstr ":${port}"`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    const pids = new Set();
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && /LISTENING/i.test(line))
      .forEach((line) => {
        const parts = line.split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid)) {
          pids.add(pid);
        }
      });

    return [...pids];
  } catch (error) {
    return [];
  }
};

const killPid = (pid) => {
  try {
    execSync(`taskkill /PID ${pid} /F`, {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
    return true;
  } catch (error) {
    return false;
  }
};

const sleep = (milliseconds) => {
  try {
    execSync(
      `powershell -NoProfile -Command "Start-Sleep -Milliseconds ${milliseconds}"`,
      {
        stdio: ["ignore", "ignore", "ignore"],
      },
    );
  } catch (error) {
    // ignore sleep fallback errors
  }
};

const killed = [];
const killedSet = new Set();

const killPidWithLogging = (pid) => {
  if (killPid(pid)) {
    if (!killedSet.has(pid)) {
      killedSet.add(pid);
      killed.push(pid);
      console.log(`Killed PID ${pid}`);
    }
    return true;
  }

  console.log(`Could not kill PID ${pid}`);
  return false;
};

const waitForPortRelease = (port) => {
  const startTime = Date.now();
  let loggedWaitMessage = false;

  while (Date.now() - startTime < PORT_RELEASE_TIMEOUT_MS) {
    const pids = getListeningPids(port);
    if (pids.length === 0) {
      if (loggedWaitMessage) {
        console.log(`Port ${port}: released`);
      }
      return true;
    }

    if (!loggedWaitMessage) {
      console.log(`Port ${port}: waiting for release...`);
      loggedWaitMessage = true;
    }

    pids.forEach((pid) => {
      killPidWithLogging(pid);
    });

    sleep(PORT_RELEASE_POLL_MS);
  }

  return getListeningPids(port).length === 0;
};

ports.forEach((port) => {
  const pids = getListeningPids(port);
  if (pids.length === 0) {
    console.log(`Port ${port}: free`);
    return;
  }

  console.log(`Port ${port}: occupied by PID(s) ${pids.join(", ")}`);
  pids.forEach((pid) => killPidWithLogging(pid));

  if (!waitForPortRelease(port)) {
    const remainingPids = getListeningPids(port);
    console.log(
      `Port ${port}: still occupied by PID(s) ${remainingPids.join(", ")}`,
    );
    process.exitCode = 1;
  }
});

if (killed.length === 0) {
  console.log("No processes were killed.");
} else {
  console.log(`Cleanup complete. Killed PID(s): ${killed.join(", ")}`);
}

if (process.exitCode === 1) {
  console.log(
    "Port cleanup could not finish completely. Please close conflicting app(s) and retry.",
  );
}
