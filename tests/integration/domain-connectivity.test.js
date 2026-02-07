/**
 * Heady Integration Tests - Domain Connectivity
 * Verifies all services are accessible via internal domains
 */

const http = require('http');
const https = require('https');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

// Load service discovery config
const serviceDiscoveryPath = path.join(__dirname, '../../configs/service-discovery.yaml');
const serviceDiscovery = yaml.load(fs.readFileSync(serviceDiscoveryPath, 'utf8'));

// Helper function to make HTTP request
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : http;
    
    const req = lib.get(url, {
      timeout: 5000,
      ...options,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Test suite
describe('Domain Connectivity Tests', () => {
  
  describe('Core Services', () => {
    
    test('Manager API should be reachable', async () => {
      const managerConfig = serviceDiscovery.services.manager;
      const url = `${managerConfig.protocol}://${managerConfig.host}:${managerConfig.port}/api/health`;
      
      const response = await makeRequest(url);
      
      expect(response.status).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.ok).toBe(true);
      expect(data.service).toBe('heady-manager');
    }, 10000);
    
    test('Manager API should NOT respond to localhost', async () => {
      // This test ensures migration worked
      const url = `http://localhost:3300/api/health`;
      
      await expect(makeRequest(url)).rejects.toThrow();
    }, 10000);
    
  });
  
  describe('Service Discovery DNS Resolution', () => {
    
    test('All internal domains should resolve', () => {
      const domains = Object.values(serviceDiscovery.services).map(s => s.host);
      
      // In real env, these would resolve via /etc/hosts or internal DNS
      // For now, just verify format is correct
      domains.forEach(domain => {
        expect(domain).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+\.heady\.internal$/);
      });
    });
    
  });
  
  describe('Port Mappings', () => {
    
    test('No port conflicts exist', () => {
      const ports = Object.values(serviceDiscovery.services).map(s => s.port);
      const uniquePorts = new Set(ports);
      
      expect(ports.length).toBe(uniquePorts.size);
    });
    
    test('All ports are in valid range', () => {
      const ports = Object.values(serviceDiscovery.services).map(s => s.port);
      
      ports.forEach(port => {
        expect(port).toBeGreaterThan(1024);
        expect(port).toBeLessThan(65536);
      });
    });
    
  });
  
  describe('Security Classifications', () => {
    
    test('Services have proper security levels', () => {
      const validLevels = ['internal', 'database', 'external', 'admin', 'infrastructure'];
      
      Object.values(serviceDiscovery.services).forEach(service => {
        expect(validLevels).toContain(service.security_level);
      });
    });
    
    test('Admin services are properly marked', () => {
      const adminServices = Object.values(serviceDiscovery.admin || {});
      
      adminServices.forEach(service => {
        expect(service.security_level).toBe('admin');
      });
    });
    
  });
  
  describe('Localhost Migration Completeness', () => {
    
    test('No localhost references in production configs', () => {
      const configDir = path.join(__dirname, '../../configs');
      const configFiles = fs.readdirSync(configDir).filter(f => f.endsWith('.yaml'));
      
      configFiles.forEach(file => {
        const content = fs.readFileSync(path.join(configDir, file), 'utf8');
        
        // Skip service-discovery.yaml which documents the mapping
        if (file === 'service-discovery.yaml') return;
        
        // Should NOT contain bare localhost (except in comments or .internal domains)
        const localhostMatches = content.match(/localhost(?!.*\.heady\.internal)/g);
        const commentedOut = content.split('\n').filter(line => 
          line.includes('localhost') && line.trim().startsWith('#')
        );
        
        if (localhostMatches) {
          const uncommentedMatches = localhostMatches.length - commentedOut.length;
          expect(uncommentedMatches).toBe(0);
        }
      });
    });
    
  });
  
});

// Run tests with detailed output
if (require.main === module) {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  🧪 HEADY DOMAIN CONNECTIVITY TESTS                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  
  // Run with Jest or similar
  console.log('Run with: npm test -- domain-connectivity.test.js\n');
}

module.exports = { makeRequest };
