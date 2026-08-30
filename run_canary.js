const { routeCommand } = require('./lib/ai/router');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function runCanary() {
    const command = "Return the current StewardHQ portfolio business count and identify the business currently assigned the highest-priority active task.";
    console.log('--- RUNNING CANARY COMMAND ---');
    const result = await routeCommand(command);
    console.log(JSON.stringify(result, null, 2));
}

runCanary();
