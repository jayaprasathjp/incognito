import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        console.log("Auth: No token provided");
        return res.sendStatus(401);
    }

    jwt.verify(token, process.env.JWT_SECRET || "default_secret", (err, user) => {
        if (err) {
            console.log("Auth: Token verification failed", err.message);
            return res.sendStatus(403);
        }
        console.log("Auth: User authenticated", user.username);
        console.log("Auth: User Role:", user.role);
        req.user = user;
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
