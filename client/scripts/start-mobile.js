const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const devPort = process.env.PORT || "3000";

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

console.log("\nRecommended mobile URL:");
console.log(`- http://${primaryIp}:${devPort}`);

if (localIps.all.length > 1) {
  console.log("\nOther local URL(s):");
  localIps.all
    .filter((ip) => ip !== primaryIp)
    .forEach((ip) => console.log(`- http://${ip}:${devPort}`));
} else {
  console.log("\nNo additional local network adapters detected.");
}
console.log("");

const reactScriptsStartPath = path.resolve(
  __dirname,
  "..",
  "node_modules",
  "react-scripts",
  "scripts",
  "start.js",
);

const mergedNodeOptions = [process.env.NODE_OPTIONS, "--no-deprecation"]
  .filter(Boolean)
  .join(" ")
  .trim();

const child = spawn(process.execPath, [reactScriptsStartPath], {
  stdio: "inherit",
  env: {
    ...process.env,
    HOST: "0.0.0.0",
    NODE_OPTIONS: mergedNodeOptions,
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
