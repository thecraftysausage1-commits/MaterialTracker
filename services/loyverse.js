const axios = require("axios");

const loyverse = axios.create({
    baseURL: "https://api.loyverse.com/v1.0",
    headers: {
        Authorization: `Bearer ${process.env.LOYVERSE_TOKEN}`,
        "Content-Type": "application/json"
    }
});

module.exports = loyverse;