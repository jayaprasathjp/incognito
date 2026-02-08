// import fetch from "node-fetch";
// import "dotenv/config"; // Not needed if running with node -r dotenv/config

async function testLifecycle() {
    try {
        console.log("1. Logging in as admin...");
        const loginRes = await fetch("http://localhost:5000/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "admin@test.com", password: "password" })
        });
        const loginData = await loginRes.json();
        if (!loginData.token) {
            console.error("Login failed:", loginData);
            return;
        }
        const token = loginData.token;
        console.log("Logged in.");

        console.log("2. Cycling Tournament...");
        const cycleRes = await fetch("http://localhost:5000/api/admin/tournaments/cycle", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({})
        });
        const cycleData = await cycleRes.json();
        console.log("Cycle Result:", cycleData);

        if (!cycleData.tournament) {
            console.error("Cycle failed");
            return;
        }

        console.log("3. Registering New User...");
        const username = "cycler" + Date.now();
        const regRes = await fetch("http://localhost:5000/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: username,
                email: `${username}@test.com`,
                password: "password123",
                institution: "Test Inst",
                whatsapp_number: "1234567890"
            })
        });
        const regData = await regRes.json();
        console.log("Registration Result:", regData.id ? "Success" : regData);

        if (!regData.id) return;

        console.log("4. Verifying Participation (via User Login)...");
        // Login as new user to check dashboard status
        const userLoginRes = await fetch("http://localhost:5000/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: `${username}@test.com`, password: "password123" })
        });
        const userLoginData = await userLoginRes.json();
        const userToken = userLoginData.token;

        const currentRes = await fetch("http://localhost:5000/api/tournaments/current", {
            headers: { "Authorization": `Bearer ${userToken}` }
        });
        const currentData = await currentRes.json();
        
        console.log("--- DASHBOARD DATA ---");
        console.log("Tournament:", currentData.tournament?.title);
        console.log("Participation Status:", currentData.participation?.status);
        
        if (currentData.participation?.status === 'approved') {
            console.log("SUCCESS: User auto-registered and approved.");
        } else {
            console.log("FAILURE: User not registered.");
        }

    } catch (err) {
        console.error(err);
    }
}

testLifecycle();
