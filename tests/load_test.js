import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 100 }, // Ramp up to 100 users
        { duration: '1m', target: 1000 }, // Scale to 1000 users
        { duration: '30s', target: 0 },    // Scale down
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'], // <1% errors
        http_req_duration: ['p95<100'], // 95% of requests should be <100ms
    },
};

export default function () {
    const url = 'http://localhost:3001/ingest';
    const payload = JSON.stringify({
        user_id: `user_${Math.floor(Math.random() * 10000)}`,
        type: 'button_click',
        metadata: {
            page: '/dashboard',
            button_id: 'buy_now'
        }
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res = http.post(url, payload, params);

    check(res, {
        'is status 202': (r) => r.status === 202,
        'is status 429': (r) => r.status === 429,
    });

    sleep(0.1); // Small sleep to avoid CPU saturation on single local machine
}
