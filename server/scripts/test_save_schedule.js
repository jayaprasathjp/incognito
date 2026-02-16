
// ESM Script

async function testSaveSchedule() {
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

        console.log("2. Fetching tournament ID...");
        const tourneyRes = await fetch("http://localhost:5000/api/admin/tournaments/control", {
            headers: { "Authorization": `Bearer ${loginData.token}` }
        });
        const tourneyData = await tourneyRes.json();
        const id = tourneyData.id;
        console.log("Tournament Found:", id);

        console.log("3. Saving Schedule...");
        const rounds_config = {
            type: "Single Elimination",
            description: "Test Schedule",
            rounds: [
                { name: "Round 1", matches: 4, players: 8, date: "2024-12-25" },
                { name: "Semi-Finals", matches: 2, players: 4, date: "2024-12-26" },
                { name: "Finals", matches: 1, players: 2, date: "2024-12-27" }
            ]
        };

        const saveRes = await fetch("http://localhost:5000/api/admin/tournaments/control", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${loginData.token}`
            },
            body: JSON.stringify({ action: "save_schedule", id, rounds_config: rounds_config })
        });
        
        console.log("Status:", saveRes.status, saveRes.statusText);
        const saveData = await saveRes.json();
        
        console.log("--- SAVE RESULT ---");
        console.log(JSON.stringify(saveData, null, 2));

    } catch (err) {
        console.error(err);
    }
}

testSaveSchedule();
