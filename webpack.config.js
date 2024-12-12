const Dotenv = require("dotenv-webpack");

module.exports = {
    plugins: [
        new Dotenv({
            path: "./.env", // Path to your .env file
            systemvars: true, // Load system environment variables as well
        }),
    ],
};