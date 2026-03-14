const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const serverPort = process.env.PORT || "5000";

const isLikelyVirtualInterface = (name) =>
  /(virtual|virtualbox|vmware|hyper-v|host-only|vethernet|loopback)/i.test(
    name,
  );

const getLocalIpAddresses = () => {
  const interfaces = os.networkInterfaces();
  const preferredIps = [];
  const fallbackIps = [];

  Object.entries(interfaces).forEach(([name, entries]) => {
    const targetList = isLikelyVirtualInterface(name)
      ? fallbackIps
      : preferredIps;

    (entries || []).forEach((details) => {
      if (!details || details.internal || details.family !== "IPv4") {
        return;
      }

      if (details.address.startsWith("169.254.")) {
        return;
      }

      targetList.push(details.address);
    });
  });

  const uniquePreferredIps = [...new Set(preferredIps)];
  const uniqueFallbackIps = [...new Set(fallbackIps)];

  return {
    preferred: uniquePreferredIps,
    all: [...new Set([...uniquePreferredIps, ...uniqueFallbackIps])],
  };
};

const localIps = getLocalIpAddresses();
const primaryIp = (
  localIps.preferred[0] ||
  localIps.all[0] ||
  "localhost"
).trim();

console.log("\nRecommended backend URL(s):");
console.log(`- API: http://${primaryIp}:${serverPort}/api/chat`);
console.log(`- Health: http://${primaryIp}:${serverPort}/health`);

if (localIps.all.length > 1) {
  console.log("\nOther local backend URL(s):");
  localIps.all
    .filter((ip) => ip !== primaryIp)
    .forEach((ip) => {
      console.log(`- API: http://${ip}:${serverPort}/api/chat`);
      console.log(`- Health: http://${ip}:${serverPort}/health`);
    });
}

console.log("");

const serverEntryPath = path.resolve(__dirname, "..", "server.js");

const child = spawn(process.execPath, [serverEntryPath], {
  stdio: "inherit",
  env: {
    ...process.env,
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
