require("dotenv").config();

const { loginDeviceByIp } = require("tp-link-tapo-connect");

const devices = {
    pc1: process.env.PC1_IP,
    pc2: process.env.PC2_IP,
    printer: process.env.PRINTER_IP
};

async function main() {
    const deviceName = (process.argv[2] || "").toLowerCase();
    const action = (process.argv[3] || "").toLowerCase();

    if (!devices[deviceName]) {
        console.error(`Unknown device: ${deviceName}`);
        process.exit(1);
    }

    if (!["on", "off"].includes(action)) {
        console.error("Usage: node Scripts/tapo.js <device> <on|off>");
        process.exit(1);
    }

    const ip = devices[deviceName];

    console.log(`Connecting to ${deviceName} (${ip})...`);

    try {
        // Correct argument order:
        // loginDeviceByIp(email, password, deviceIp)
        const plug = await loginDeviceByIp(
    process.env.TAPO_USERNAME.trim(),
    process.env.TAPO_PASSWORD.trim(),
    ip
);


        if (action === "on") {
            await plug.turnOn();
            console.log(`${deviceName} turned ON`);
        } else {
            await plug.turnOff();
            console.log(`${deviceName} turned OFF`);
        }

        process.exit(0);
    } catch (err) {
        console.error("Failed to control plug:");
        console.error(err);
        process.exit(1);
    }
}

main();