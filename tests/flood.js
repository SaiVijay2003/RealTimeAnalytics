const http = require('http');

const TOTAL_EVENTS = 10000;
const CONCURRENCY = 50; // Requests at once
const URL = 'http://localhost:3001/ingest';

async function sendEvent(id) {
    return new Promise((resolve) => {
        const data = JSON.stringify({
            user_id: `user_${Math.floor(Math.random() * 100)}`,
            type: 'load_test_event',
            metadata: { iteration: id }
        });

        const req = http.request(URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        }, (res) => {
            resolve(res.statusCode);
        });

        req.on('error', (e) => {
            console.error(`Problem with request: ${e.message}`);
            resolve(500);
        });

        req.write(data);
        req.end();
    });
}

async function runTest() {
    console.log(`🚀 Starting Load Test: Sending ${TOTAL_EVENTS} events...`);
    const start = Date.now();

    for (let i = 0; i < TOTAL_EVENTS; i += CONCURRENCY) {
        const batch = [];
        for (let j = 0; j < CONCURRENCY && (i + j) < TOTAL_EVENTS; j++) {
            batch.push(sendEvent(i + j));
        }
        await Promise.all(batch);
        if (i % 500 === 0) console.log(`Processed ${i} events...`);
    }

    const duration = (Date.now() - start) / 1000;
    console.log(`\n✅ Done!`);
    console.log(`Total Events: ${TOTAL_EVENTS}`);
    console.log(`Duration: ${duration.toFixed(2)}s`);
    console.log(`Throughput: ${(TOTAL_EVENTS / duration).toFixed(2)} events/sec`);
}

runTest();
