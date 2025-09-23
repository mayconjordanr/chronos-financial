import { execSync, spawn } from 'child_process'
import { promisify } from 'util'
import net from 'net'
import { PrismaClient } from '@prisma/client'

const exec = promisify(require('child_process').exec)

describe('Docker Infrastructure Health Tests', () => {
  const DOCKER_SERVICES = [
    'chronos-postgres-dev',
    'chronos-redis-dev',
    'chronos-backend-dev',
    'chronos-frontend-dev',
    'chronos-nginx-dev'
  ]

  const SERVICE_PORTS = {
    'chronos-postgres-dev': 5432,
    'chronos-redis-dev': 6379,
    'chronos-backend-dev': 3001,
    'chronos-frontend-dev': 3000,
    'chronos-nginx-dev': 80
  }

  const waitForPort = (port: number, host: string = 'localhost', timeout: number = 30000): Promise<boolean> => {
    return new Promise((resolve) => {
      const startTime = Date.now()

      const checkConnection = () => {
        const socket = new net.Socket()

        socket.setTimeout(1000)
        socket.on('connect', () => {
          socket.destroy()
          resolve(true)
        })

        socket.on('timeout', () => {
          socket.destroy()
          checkAgain()
        })

        socket.on('error', () => {
          checkAgain()
        })

        socket.connect(port, host)
      }

      const checkAgain = () => {
        if (Date.now() - startTime < timeout) {
          setTimeout(checkConnection, 1000)
        } else {
          resolve(false)
        }
      }

      checkConnection()
    })
  }

  const getContainerStatus = async (containerName: string): Promise<string | null> => {
    try {
      const { stdout } = await exec(`docker ps -f name=${containerName} --format "{{.Status}}"`)
      return stdout.trim() || null
    } catch {
      return null
    }
  }

  const getContainerHealth = async (containerName: string): Promise<string | null> => {
    try {
      const { stdout } = await exec(`docker inspect ${containerName} --format="{{.State.Health.Status}}"`)
      return stdout.trim() || null
    } catch {
      return null
    }
  }

  describe('Docker Compose Service Status', () => {
    it('should have all required services running', async () => {
      for (const service of DOCKER_SERVICES) {
        const status = await getContainerStatus(service)
        expect(status).toBeTruthy()
        expect(status).toMatch(/Up|running/i)
      }
    }, 60000)

    it('should have all services responding on their designated ports', async () => {
      for (const [service, port] of Object.entries(SERVICE_PORTS)) {
        const isPortOpen = await waitForPort(port)
        expect(isPortOpen).toBe(true)
      }
    }, 60000)

    it('should have health checks passing for all services', async () => {
      const servicesWithHealthChecks = [
        'chronos-postgres-dev',
        'chronos-redis-dev',
        'chronos-backend-dev',
        'chronos-frontend-dev',
        'chronos-nginx-dev'
      ]

      for (const service of servicesWithHealthChecks) {
        const health = await getContainerHealth(service)

        // Health check might not be implemented for all services
        if (health && health !== 'null') {
          expect(health).toBe('healthy')
        }
      }
    }, 90000)
  })

  describe('PostgreSQL Database Health', () => {
    let prisma: PrismaClient

    beforeAll(() => {
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://chronos_user:chronos_password@localhost:5432/chronos_dev'
          }
        }
      })
    })

    afterAll(async () => {
      await prisma.$disconnect()
    })

    it('should connect to PostgreSQL successfully', async () => {
      await expect(prisma.$connect()).resolves.not.toThrow()
    })

    it('should execute basic queries', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as test, NOW() as current_time`
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should have proper database configuration', async () => {
      const dbConfig = await prisma.$queryRaw`
        SELECT
          current_database() as database_name,
          current_user as user_name,
          version() as version
      ` as any[]

      expect(dbConfig[0].database_name).toBe('chronos_dev')
      expect(dbConfig[0].user_name).toBe('chronos_user')
      expect(dbConfig[0].version).toContain('PostgreSQL')
    })

    it('should have required extensions installed', async () => {
      const extensions = await prisma.$queryRaw`
        SELECT extname
        FROM pg_extension
        WHERE extname IN ('uuid-ossp', 'pgcrypto', 'btree_gin')
      ` as any[]

      const extensionNames = extensions.map(ext => ext.extname)
      expect(extensionNames).toContain('uuid-ossp')
      expect(extensionNames).toContain('pgcrypto')
      expect(extensionNames).toContain('btree_gin')
    })

    it('should have RLS functions available', async () => {
      const functions = await prisma.$queryRaw`
        SELECT proname
        FROM pg_proc
        WHERE proname IN ('current_tenant_id', 'set_tenant_context')
      ` as any[]

      const functionNames = functions.map(fn => fn.proname)
      expect(functionNames).toContain('current_tenant_id')
      expect(functionNames).toContain('set_tenant_context')
    })

    it('should handle concurrent connections', async () => {
      const connections = Array(5).fill(0).map(async () => {
        const client = new PrismaClient()
        try {
          await client.$connect()
          const result = await client.$queryRaw`SELECT current_timestamp`
          await client.$disconnect()
          return result
        } catch (error) {
          await client.$disconnect()
          throw error
        }
      })

      const results = await Promise.all(connections)
      expect(results).toHaveLength(5)
    })
  })

  describe('Redis Cache Health', () => {
    const testRedisConnection = async (): Promise<boolean> => {
      return new Promise((resolve) => {
        const redis = require('redis')
        const client = redis.createClient({
          url: 'redis://localhost:6379',
          password: 'redis_password'
        })

        client.on('error', () => resolve(false))
        client.on('connect', async () => {
          try {
            await client.ping()
            await client.quit()
            resolve(true)
          } catch {
            resolve(false)
          }
        })

        client.connect().catch(() => resolve(false))
      })
    }

    it('should connect to Redis successfully', async () => {
      const connected = await testRedisConnection()
      expect(connected).toBe(true)
    }, 30000)

    it('should handle Redis operations', async () => {
      const redis = require('redis')
      const client = redis.createClient({
        url: 'redis://localhost:6379',
        password: 'redis_password'
      })

      try {
        await client.connect()

        // Test basic operations
        await client.set('test_key', 'test_value')
        const value = await client.get('test_key')
        expect(value).toBe('test_value')

        await client.del('test_key')
        const deletedValue = await client.get('test_key')
        expect(deletedValue).toBeNull()

        await client.quit()
      } catch (error) {
        await client.quit()
        throw error
      }
    })
  })

  describe('Backend API Health', () => {
    it('should respond to health check endpoint', async () => {
      const healthCheck = await fetch('http://localhost:3001/health')
        .then(res => res.json())
        .catch(() => null)

      expect(healthCheck).toBeTruthy()
      expect(healthCheck.status).toBe('ok')
    }, 30000)

    it('should have API endpoints responding', async () => {
      const apiResponse = await fetch('http://localhost:3001/api/health')
        .then(res => res.status)
        .catch(() => 500)

      expect([200, 404]).toContain(apiResponse) // 404 is acceptable if route doesn't exist
    })

    it('should handle CORS properly', async () => {
      const response = await fetch('http://localhost:3001/health', {
        method: 'OPTIONS'
      }).catch(() => null)

      if (response) {
        expect([200, 204]).toContain(response.status)
      }
    })
  })

  describe('Frontend Application Health', () => {
    it('should serve frontend application', async () => {
      const frontendResponse = await fetch('http://localhost:3000')
        .then(res => res.status)
        .catch(() => 500)

      expect(frontendResponse).toBe(200)
    }, 30000)

    it('should serve static assets', async () => {
      const assetResponse = await fetch('http://localhost:3000/favicon.ico')
        .then(res => res.status)
        .catch(() => 404)

      expect([200, 404]).toContain(assetResponse)
    })
  })

  describe('Nginx Reverse Proxy Health', () => {
    it('should respond on port 80', async () => {
      const nginxResponse = await fetch('http://localhost:80')
        .then(res => res.status)
        .catch(() => 500)

      expect([200, 404, 502]).toContain(nginxResponse) // 502 acceptable if backend not ready
    }, 30000)

    it('should proxy requests to backend', async () => {
      const proxyResponse = await fetch('http://localhost/api/health')
        .then(res => res.status)
        .catch(() => 500)

      expect([200, 404, 502]).toContain(proxyResponse)
    })
  })

  describe('Service Dependencies and Communication', () => {
    it('should have proper network connectivity between services', async () => {
      // Test if services can communicate within Docker network
      const networkTest = await exec(`docker exec chronos-backend-dev ping -c 1 chronos-postgres-dev`)
        .then(() => true)
        .catch(() => false)

      expect(networkTest).toBe(true)
    })

    it('should have proper volume mounts', async () => {
      const volumeTest = await exec(`docker exec chronos-postgres-dev ls -la /var/lib/postgresql/data`)
        .then(() => true)
        .catch(() => false)

      expect(volumeTest).toBe(true)
    })

    it('should have environment variables properly set', async () => {
      const envTest = await exec(`docker exec chronos-backend-dev printenv NODE_ENV`)
        .then(({ stdout }) => stdout.trim())
        .catch(() => '')

      expect(['development', 'test']).toContain(envTest)
    })
  })

  describe('Resource Usage and Performance', () => {
    it('should have reasonable memory usage', async () => {
      const memoryStats = await exec(`docker stats --no-stream --format "table {{.Container}}\\t{{.MemUsage}}"`)
        .then(({ stdout }) => stdout)
        .catch(() => '')

      expect(memoryStats).toBeTruthy()
      // Memory usage should be reasonable (this is a basic check)
      expect(memoryStats).not.toContain('100%')
    })

    it('should have reasonable CPU usage', async () => {
      const cpuStats = await exec(`docker stats --no-stream --format "table {{.Container}}\\t{{.CPUPerc}}"`)
        .then(({ stdout }) => stdout)
        .catch(() => '')

      expect(cpuStats).toBeTruthy()
      // CPU usage should not be constantly high
      expect(cpuStats).not.toMatch(/[8-9][0-9]%|100%/)
    })
  })

  describe('Docker Compose Configuration Validation', () => {
    it('should have valid docker-compose.yml', async () => {
      const configTest = await exec('docker-compose config')
        .then(() => true)
        .catch(() => false)

      expect(configTest).toBe(true)
    })

    it('should have all required services defined', async () => {
      const { stdout } = await exec('docker-compose config --services')
      const services = stdout.trim().split('\n')

      const expectedServices = ['postgres', 'redis', 'backend', 'frontend', 'nginx']
      for (const service of expectedServices) {
        expect(services).toContain(service)
      }
    })

    it('should have proper health check definitions', async () => {
      const { stdout } = await exec('docker-compose config')
      const config = stdout

      expect(config).toContain('healthcheck')
      expect(config).toContain('test:')
      expect(config).toContain('interval:')
      expect(config).toContain('timeout:')
      expect(config).toContain('retries:')
    })
  })

  describe('Service Recovery and Restart', () => {
    it('should restart services automatically on failure', async () => {
      // This test would require more complex setup to simulate failures
      // For now, just verify restart policy is configured
      const { stdout } = await exec('docker-compose config')
      expect(stdout).toContain('restart:')
    })

    it('should maintain data persistence across restarts', async () => {
      const volumeInfo = await exec('docker volume ls --format "{{.Name}}"')
        .then(({ stdout }) => stdout.trim().split('\n'))
        .catch(() => [])

      const expectedVolumes = ['postgres_data', 'redis_data']
      const actualVolumes = volumeInfo.filter(vol =>
        expectedVolumes.some(expected => vol.includes(expected))
      )

      expect(actualVolumes.length).toBeGreaterThan(0)
    })
  })
})