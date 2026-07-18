const axios = require("axios");

const loyverse = axios.create({
    baseURL: "https://api.loyverse.com/v1.0",
    headers: {
        Authorization: `Bearer ${process.env.6351413bdfbb4f60b086f909e9011644}`,
        "Content-Type": "application/json"
    }
});

module.exports = loyverse;