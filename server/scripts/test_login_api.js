
const testLogin = async () => {
    const url = 'http://localhost:5000/api/auth/login';
    const body = {
        identifier: 'admin', // Testing with username
        password: 'password123'
    };

    try {
        console.log(`Sending POST to ${url} with`, body);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', data);
    } catch (error) {
        console.error('Error:', error.message);
    }
};

testLogin();
