"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_codedeploy_1 = require("@aws-sdk/client-codedeploy");
const client_s3_1 = require("@aws-sdk/client-s3");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const umzug_1 = require("umzug");
const env = __importStar(require("./util/env"));
const clients_1 = __importDefault(require("./clients"));
const storage_1 = __importDefault(require("./storage"));
const { aws: { region }, db, migrations } = env.get();
const codeDeploy = new client_codedeploy_1.CodeDeployClient({ region });
const s3 = new client_s3_1.S3Client({ region });
async function handler(event) {
    let failed = false;
    let client = null;
    const { DeploymentId: deploymentId, LifecycleEventHookExecutionId: executionId, Combined: combined } = event;
    try {
        // Download migration files
        await downloadMigrations(migrations.bucket, migrations.dir);
        // Establish database connection
        client = clients_1.default[db.engine];
        await client.connect(db);
        // Run schema migrations
        const umzug = new umzug_1.Umzug({
            storage: storage_1.default[db.engine],
            migrations: { glob: migrations.dir + '/*' },
            context: { client, table: migrations.table },
            logger: console
        });
        try {
            await umzug.up();
        }
        catch (e) {
            // Best effort to clean up failed migrations
            const matches = e.message.match(/^Migration (\w+) (up|down) failed$/);
            const [, migrationName, direction] = matches || [];
            if (direction === 'up')
                await umzug.down({ migrations: [migrationName] });
            // Throw original error to surface problem better
            // Docs: https://github.com/sequelize/umzug#errors
            if (e instanceof umzug_1.MigrationError) {
                throw e.cause();
            }
            // Throw other errors like normal
            throw e;
        }
    }
    catch (e) {
        failed = true;
        console.error(e.stack);
        throw e;
    }
    finally {
        // Close database connection
        if (client) {
            await client.close();
        }
        // Report lifecycle event hook status, if not combined
        // Note: This allows us to call the lambda from a lifecycle hook or invoke it directly
        if (!combined) {
            const putLifecycleEventHookExecutionStatusCommand = new client_codedeploy_1.PutLifecycleEventHookExecutionStatusCommand({
                deploymentId: deploymentId,
                lifecycleEventHookExecutionId: executionId,
                status: failed ? 'Failed' : 'Succeeded'
            });
            await codeDeploy.send(putLifecycleEventHookExecutionStatusCommand);
        }
    }
}
exports.handler = handler;
async function downloadMigrations(bucket, downloadFolder) {
    // Ensure download folder exists
    await fs.mkdir(downloadFolder);
    // List bucket contents
    const listObjectsCommand = new client_s3_1.ListObjectsCommand({ Bucket: bucket });
    const { Contents: migrationFiles = [] } = await s3.send(listObjectsCommand);
    // Download all migrations
    const downloads = await Promise.all(migrationFiles.map(async (file) => {
        const { Key } = file;
        const getObjectCommand = new client_s3_1.GetObjectCommand({ Bucket: bucket, Key });
        const { Body } = await s3.send(getObjectCommand);
        // Object will always have a Key
        return { fileName: Key, content: Body };
    }));
    // Store all migrations locally
    await Promise.all(downloads.map(async ({ fileName, content }) => {
        return fs.writeFile(path.join(downloadFolder, fileName), content);
    }));
}
