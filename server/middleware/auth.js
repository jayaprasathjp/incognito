import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    console.log("Auth: authenticateToken hit - Token:", token ? "exists" : "missing");

    if (!token || token === 'null' || token === 'undefined') {
        console.log("Auth: No token or invalid token string provided");
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    jwt.verify(token, process.env.JWT_SECRET || "default_secret", (err, user) => {
        if (err) {
            console.log("Auth: Token verification failed", err.message);
            return res.status(403).json({ error: "Forbidden: Token verification failed" });
        }
        console.log("Auth: User authenticated", user.username);
        req.user = user;
        next();
    });
};

export const optionalAuthenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    console.log("Auth: optionalAuthenticateToken hit - Token:", token ? "exists" : "missing");

    if (!token || token === 'null' || token === 'undefined') {
        console.log("Auth: Proceeding as guest");
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET || "default_secret", (err, user) => {
        if (!err) {
            console.log("Auth: Optional token valid - User:", user.username);
            req.user = user;
        } else {
            console.log("Auth: Optional token invalid - proceeding as guest");
        }
        next();
    });
};

export const authorizeAdmin = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        console.log("Auth: Admin authorized");
        next();
    } else {
        console.log("Auth: Non-admin user denied", req.user?.role);
        return res.status(403).json({ error: "Admin access required" });
    }
};
