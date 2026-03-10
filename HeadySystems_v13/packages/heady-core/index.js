// Heady Sovereign Node Core - v4.0.0 Architecture
const PHI = 1.618033988749895;
const PSI = 1 / PHI;
const PSI2 = PSI * PSI;
const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];
const CSL_GATES = { include: PSI2, boost: PSI, inject: PSI + 0.1 };

// Structured JSON Logging to replace console.log debugging
function createLogger(serviceName) {
    return {
        info: (msg, data = {}) => console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'INFO', service: serviceName, message: msg, ...data })),
        error: (msg, error) => console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'ERROR', service: serviceName, message: msg, error: error?.message || error })),
        warn: (msg, data = {}) => console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'WARN', service: serviceName, message: msg, ...data }))
    };
}

// HeadyAutoContext Middleware (Mandatory)
function headyAutoContext(req, res, next) {
    req.headyContext = {
        phi: PHI,
        csl: CSL_GATES,
        fib: FIB
    };
    next();
}

module.exports = { PHI, PSI, PSI2, FIB, CSL_GATES, createLogger, headyAutoContext };
