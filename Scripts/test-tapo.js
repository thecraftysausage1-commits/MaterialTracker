require("dotenv").config();

const { loginDeviceByIp } = require("tp-link-tapo-connect");

(async () => {
    try {
        console.log("Email:", process.env.TAPO_USERNAME);
        console.log("Password length:", process.env.TAPO_PASSWORD.length);

        const device = await loginDeviceByIp(
            process.env.TAPO_USERNAME.trim(),
            process.env.TAPO_PASSWORD.trim(),
            process.env.PC1_IP
        );

        console.log("Connected!");
        console.log(await device.getDeviceInfo());

    } catch (e) {
        console.error(e.message);
    }
})();