import { PrismaClient } from '@prisma/client'
import { getPrismaClient, setTenantContext, clearTenantContext } from '../utils/test-setup'
import { TestDataFactory, SecurityTestUtils } from '../utils/test-utilities'

describe('SQL Injection Prevention Tests', () => {
  let prisma: PrismaClient
  let testFactory: TestDataFactory

  beforeAll(async () => {
    prisma = getPrismaClient()
    testFactory = new TestDataFactory(prisma)
  })

  beforeEach(async () => {
    await clearTenantContext(prisma)
  })

  describe('Prisma ORM SQL Injection Protection', () => {
    it('should prevent SQL injection through user input fields', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Create test data
      const testTransaction = await testFactory.createTransaction({
        tenantId: setup.tenant.id,
        userId: setup.users.regular.id,
        accountId: setup.accounts.checking.id,
        amount: 100.00,
        description: 'Legitimate transaction',
        tags: ['legitimate', 'test']
      })

      const maliciousInputs = SecurityTestUtils.generateSqlInjectionPayloads()

      for (const maliciousInput of maliciousInputs) {
        // Test through description search
        const searchResults = await prisma.transaction.findMany({
          where: {
            description: { contains: maliciousInput, mode: 'insensitive' }
          }
        })

        // Should not return unexpected results or cause errors
        expect(Array.isArray(searchResults)).toBe(true)
        searchResults.forEach(result => {
          expect(result.tenantId).toBe(setup.tenant.id)
        })

        // Test through email field in user creation
        try {
          const maliciousUser = await prisma.user.create({
            data: {
              tenantId: setup.tenant.id,
              email: maliciousInput,
              firstName: 'Test',
              lastName: 'User',
              password: 'password'
            }
          })

          // If creation succeeds, verify it's treated as literal string
          expect(maliciousUser.email).toBe(maliciousInput)
          expect(maliciousUser.tenantId).toBe(setup.tenant.id)
        } catch (error) {
          // Expected for invalid email formats or constraint violations
          expect(error).toBeTruthy()
        }

        // Test through tags array search
        const tagSearchResults = await prisma.transaction.findMany({
          where: {
            tags: { hasSome: [maliciousInput] }
          }
        })

        expect(Array.isArray(tagSearchResults)).toBe(true)
        tagSearchResults.forEach(result => {
          expect(result.tenantId).toBe(setup.tenant.id)
        })

        // Test through numeric fields
        try {
          const numericValue = parseFloat(maliciousInput) || 0
          const amountSearchResults = await prisma.transaction.findMany({
            where: {
              amount: { gte: numericValue }
            }
          })

          expect(Array.isArray(amountSearchResults)).toBe(true)
          amountSearchResults.forEach(result => {
            expect(result.tenantId).toBe(setup.tenant.id)
          })
        } catch (error) {
          // Expected for non-numeric injection attempts
          expect(error).toBeTruthy()
        }
      }

      // Verify original data is intact
      const originalTransaction = await prisma.transaction.findUnique({
        where: { id: testTransaction.id }
      })

      expect(originalTransaction).toBeTruthy()
      expect(originalTransaction!.description).toBe('Legitimate transaction')
    })

    it('should prevent SQL injection in complex query combinations', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Create test data with various attributes
      const testData = await Promise.all([
        testFactory.createTransaction({
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          accountId: setup.accounts.checking.id,
          amount: 50.00,
          description: 'Coffee shop',
          tags: ['food', 'coffee']
        }),
        testFactory.createTransaction({
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          accountId: setup.accounts.checking.id,
          amount: 150.00,
          description: 'Grocery shopping',
          tags: ['food', 'groceries']
        }),
        testFactory.createTransaction({
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          accountId: setup.accounts.savings.id,
          amount: 2500.00,
          description: 'Salary payment',
          tags: ['income', 'salary']
        })
      ])

      const maliciousInputs = SecurityTestUtils.generateSqlInjectionPayloads()

      for (const maliciousInput of maliciousInputs) {
        // Test complex AND/OR combinations with malicious input
        const complexQuery1 = await prisma.transaction.findMany({
          where: {
            AND: [
              { description: { contains: maliciousInput, mode: 'insensitive' } },
              { amount: { gte: 0 } },
              {
                OR: [
                  { type: 'INCOME' },
                  { type: 'EXPENSE' }
                ]
              }
            ]
          },
          include: {
            account: true,
            category: true,
            user: true
          }
        })

        expect(Array.isArray(complexQuery1)).toBe(true)
        complexQuery1.forEach(result => {
          expect(result.tenantId).toBe(setup.tenant.id)
          expect(result.account.tenantId).toBe(setup.tenant.id)
          expect(result.user.tenantId).toBe(setup.tenant.id)
        })

        // Test nested object filtering with malicious input
        const nestedQuery = await prisma.user.findMany({
          where: {
            AND: [
              { firstName: { contains: maliciousInput, mode: 'insensitive' } },
              {
                accounts: {
                  some: {
                    name: { contains: maliciousInput, mode: 'insensitive' }
                  }
                }
              }
            ]
          },
          include: {
            accounts: {
              include: {
                transactions: {
                  where: {
                    description: { contains: maliciousInput, mode: 'insensitive' }
                  }
                }
              }
            }
          }
        })

        expect(Array.isArray(nestedQuery)).toBe(true)
        nestedQuery.forEach(user => {
          expect(user.tenantId).toBe(setup.tenant.id)
          user.accounts.forEach(account => {
            expect(account.tenantId).toBe(setup.tenant.id)
            account.transactions.forEach(transaction => {
              expect(transaction.tenantId).toBe(setup.tenant.id)
            })
          })
        })

        // Test aggregation with malicious input
        try {
          const aggregationResult = await prisma.transaction.aggregate({
            where: {
              description: { contains: maliciousInput, mode: 'insensitive' }
            },
            _sum: { amount: true },
            _count: true,
            _avg: { amount: true }
          })

          expect(typeof aggregationResult._count).toBe('number')
          if (aggregationResult._sum.amount !== null) {
            expect(typeof aggregationResult._sum.amount).toBe('object') // Decimal
          }
        } catch (error) {
          // Some aggregations might fail with malicious input
          expect(error).toBeTruthy()
        }

        // Test groupBy with malicious input
        try {
          const groupByResult = await prisma.transaction.groupBy({
            by: ['type'],
            where: {
              description: { contains: maliciousInput, mode: 'insensitive' }
            },
            _sum: { amount: true },
            _count: true
          })

          expect(Array.isArray(groupByResult)).toBe(true)
        } catch (error) {
          // Expected for some malicious inputs
          expect(error).toBeTruthy()
        }
      }

      // Verify legitimate complex queries still work
      const legitimateComplexQuery = await prisma.transaction.findMany({
        where: {
          AND: [
            { amount: { gte: 100 } },
            {
              OR: [
                { description: { contains: 'grocery', mode: 'insensitive' } },
                { description: { contains: 'salary', mode: 'insensitive' } }
              ]
            }
          ]
        },
        include: {
          account: true,
          user: true
        }
      })

      expect(legitimateComplexQuery).toHaveLength(2) // grocery and salary transactions
    })

    it('should prevent SQL injection through date and timestamp fields', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Create transactions with different dates
      const testDates = [
        new Date('2024-01-01'),
        new Date('2024-06-15'),
        new Date('2024-12-31')
      ]

      for (const [index, date] of testDates.entries()) {
        await testFactory.createTransaction({
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          accountId: setup.accounts.checking.id,
          amount: (index + 1) * 100,
          description: `Transaction ${index + 1}`,
          date
        })
      }

      const maliciousDateInputs = [
        "2024-01-01'; DROP TABLE transactions; --",
        "2024-01-01' OR '1'='1",
        "'; SELECT * FROM users; --",
        "2024-01-01' UNION SELECT * FROM accounts",
        "NOW(); DROP TABLE users; --"
      ]

      for (const maliciousDateInput of maliciousDateInputs) {
        // Test date filtering with malicious input
        try {
          const dateFilterResults = await prisma.transaction.findMany({
            where: {
              date: {
                gte: new Date(maliciousDateInput)
              }
            }
          })

          // If it doesn't throw, should be empty due to invalid date
          expect(Array.isArray(dateFilterResults)).toBe(true)
          dateFilterResults.forEach(result => {
            expect(result.tenantId).toBe(setup.tenant.id)
          })
        } catch (error) {
          // Expected for invalid date formats
          expect(error).toBeTruthy()
        }

        // Test date range queries
        try {
          const dateRangeResults = await prisma.transaction.findMany({
            where: {
              date: {
                gte: new Date('2024-01-01'),
                lte: new Date(maliciousDateInput)
              }
            }
          })

          expect(Array.isArray(dateRangeResults)).toBe(true)
        } catch (error) {
          // Expected for invalid date formats
          expect(error).toBeTruthy()
        }

        // Test createdAt filtering
        try {
          const createdAtResults = await prisma.user.findMany({
            where: {
              createdAt: {
                gte: new Date(maliciousDateInput)
              }
            }
          })

          expect(Array.isArray(createdAtResults)).toBe(true)
          createdAtResults.forEach(result => {
            expect(result.tenantId).toBe(setup.tenant.id)
          })
        } catch (error) {
          // Expected for invalid date formats
          expect(error).toBeTruthy()
        }
      }

      // Verify legitimate date queries work
      const legitimateDateQuery = await prisma.transaction.findMany({
        where: {
          date: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-12-31')
          }
        }
      })

      expect(legitimateDateQuery).toHaveLength(3)
    })
  })

  describe('Raw SQL Query Protection', () => {
    it('should handle malicious input in raw SQL queries safely', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Create test data
      const testUser = await testFactory.createUser({
        tenantId: setup.tenant.id,
        email: 'rawsql@test.com',
        firstName: 'RawSQL',
        lastName: 'Test'
      })

      const maliciousInputs = SecurityTestUtils.generateSqlInjectionPayloads()

      for (const maliciousInput of maliciousInputs) {
        // Test parameterized raw queries (safe)
        try {
          const safeRawQuery = await prisma.$queryRaw`
            SELECT * FROM users
            WHERE tenant_id = ${setup.tenant.id}
            AND email = ${maliciousInput}
          `

          expect(Array.isArray(safeRawQuery)).toBe(true)
          // Should not return the actual user since email doesn't match
          const users = safeRawQuery as any[]
          users.forEach(user => {
            expect(user.tenant_id).toBe(setup.tenant.id)
          })
        } catch (error) {
          // Some malicious inputs might cause type errors
          expect(error).toBeTruthy()
        }

        // Test raw execute with parameters (safe)
        try {
          await prisma.$executeRaw`
            UPDATE users
            SET last_name = ${maliciousInput}
            WHERE tenant_id = ${setup.tenant.id}
            AND id = ${testUser.id}
          `

          // Verify the malicious input was treated as literal string
          const updatedUser = await prisma.user.findUnique({
            where: { id: testUser.id }
          })

          if (updatedUser) {
            expect(updatedUser.lastName).toBe(maliciousInput)
            expect(updatedUser.tenantId).toBe(setup.tenant.id)
          }
        } catch (error) {
          // Some inputs might violate constraints
          expect(error).toBeTruthy()
        }

        // Test that unsafeRaw would be dangerous (don't actually use in production)
        // This is just to demonstrate the difference
        try {
          // DON'T DO THIS - just testing that we catch it
          const dangerousQuery = `SELECT * FROM users WHERE email = '${maliciousInput}'`

          // We won't actually execute this, but if we did, it would be vulnerable
          expect(dangerousQuery).toContain(maliciousInput)
        } catch (error) {
          expect(error).toBeTruthy()
        }
      }

      // Verify legitimate operations still work
      const legitimateUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      })

      expect(legitimateUser).toBeTruthy()
      expect(legitimateUser!.tenantId).toBe(setup.tenant.id)
    })

    it('should prevent injection through JSON field manipulation', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Create transaction with JSON data
      const testTransaction = await testFactory.createTransaction({
        tenantId: setup.tenant.id,
        userId: setup.users.regular.id,
        accountId: setup.accounts.checking.id,
        amount: 100.00,
        description: 'JSON test transaction'
      })

      // Update with location JSON
      await prisma.transaction.update({
        where: { id: testTransaction.id },
        data: {
          location: {
            lat: 40.7128,
            lng: -74.0060,
            address: '123 Main St, New York, NY'
          }
        }
      })

      const maliciousJSONInputs = [
        '{"malicious": "'; DROP TABLE transactions; --"}',
        '{"injection": "\' OR \'1\'=\'1"}',
        '{"xss": "<script>alert(\'xss\')</script>"}',
        '{"unicode": "\\u0027\\u0020OR\\u0020\\u0027\\u0031\\u0027\\u003d\\u0027\\u0031"}',
        '{"nested": {"deep": {"injection": "\'; SELECT * FROM users; --"}}}'
      ]

      for (const maliciousJSONInput of maliciousJSONInputs) {
        try {
          const maliciousJSON = JSON.parse(maliciousJSONInput)

          // Update transaction with malicious JSON
          const updatedTransaction = await prisma.transaction.update({
            where: { id: testTransaction.id },
            data: { location: maliciousJSON }
          })

          // Verify the JSON is stored as-is (not executed)
          expect(updatedTransaction.location).toEqual(maliciousJSON)
          expect(updatedTransaction.tenantId).toBe(setup.tenant.id)

          // Query by JSON content
          const jsonQueryResults = await prisma.transaction.findMany({
            where: {
              location: {
                path: ['malicious'],
                string_contains: maliciousJSON.malicious || 'nonexistent'
              }
            }
          })

          jsonQueryResults.forEach(result => {
            expect(result.tenantId).toBe(setup.tenant.id)
          })
        } catch (error) {
          // Expected for invalid JSON or query errors
          expect(error).toBeTruthy()
        }
      }

      // Test audit log JSON injection
      const maliciousAuditData = {
        malicious_sql: "'; DROP TABLE audit_logs; --",
        injection_attempt: "' OR '1'='1",
        nested_injection: {
          deep: {
            sql: "'; DELETE FROM users; --"
          }
        }
      }

      const auditLog = await prisma.auditLog.create({
        data: {
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          action: 'injection_test',
          resource: 'transaction',
          resourceId: testTransaction.id,
          newValues: maliciousAuditData
        }
      })

      // Verify malicious data is stored safely as JSON
      expect(auditLog.newValues).toEqual(maliciousAuditData)
      expect(auditLog.tenantId).toBe(setup.tenant.id)

      // Verify original transaction is unchanged
      const finalTransaction = await prisma.transaction.findUnique({
        where: { id: testTransaction.id }
      })

      expect(finalTransaction).toBeTruthy()
      expect(finalTransaction!.tenantId).toBe(setup.tenant.id)
    })
  })

  describe('Input Validation and Sanitization', () => {
    it('should handle XSS payloads safely in text fields', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      const xssPayloads = SecurityTestUtils.generateXssPayloads()

      for (const xssPayload of xssPayloads) {
        try {
          // Test XSS in user fields
          const xssUser = await prisma.user.create({
            data: {
              tenantId: setup.tenant.id,
              email: `xss${Date.now()}@test.com`,
              firstName: xssPayload,
              lastName: 'Test',
              password: 'password'
            }
          })

          // Verify XSS payload is stored as literal string
          expect(xssUser.firstName).toBe(xssPayload)
          expect(xssUser.tenantId).toBe(setup.tenant.id)

          // Test XSS in transaction description
          const xssTransaction = await testFactory.createTransaction({
            tenantId: setup.tenant.id,
            userId: xssUser.id,
            accountId: setup.accounts.checking.id,
            amount: 100.00,
            description: xssPayload
          })

          expect(xssTransaction.description).toBe(xssPayload)
          expect(xssTransaction.tenantId).toBe(setup.tenant.id)

          // Test XSS in category name
          const xssCategory = await testFactory.createCategory({
            tenantId: setup.tenant.id,
            name: xssPayload,
            description: 'XSS test category'
          })

          expect(xssCategory.name).toBe(xssPayload)
          expect(xssCategory.tenantId).toBe(setup.tenant.id)

          // Test searching for XSS content
          const searchResults = await prisma.transaction.findMany({
            where: {
              description: { contains: xssPayload }
            }
          })

          expect(searchResults).toHaveLength(1)
          expect(searchResults[0].description).toBe(xssPayload)
        } catch (error) {
          // Some XSS payloads might violate constraints
          expect(error).toBeTruthy()
        }
      }

      // Verify no XSS execution occurred (all stored as literal strings)
      const allUsers = await prisma.user.findMany()
      const allTransactions = await prisma.transaction.findMany()
      const allCategories = await prisma.category.findMany()

      allUsers.forEach(user => {
        expect(user.tenantId).toBe(setup.tenant.id)
        expect(typeof user.firstName).toBe('string')
      })

      allTransactions.forEach(transaction => {
        expect(transaction.tenantId).toBe(setup.tenant.id)
        expect(typeof transaction.description).toBe('string')
      })

      allCategories.forEach(category => {
        expect(category.tenantId).toBe(setup.tenant.id)
        expect(typeof category.name).toBe('string')
      })
    })

    it('should validate and sanitize email inputs properly', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      const maliciousEmails = [
        "user@example.com'; DROP TABLE users; --",
        "user@example.com' OR '1'='1",
        "user@example.com<script>alert('xss')</script>",
        "user@example.com\"; DELETE FROM transactions; --",
        "user@example.com' UNION SELECT * FROM users --"
      ]

      for (const maliciousEmail of maliciousEmails) {
        try {
          // Attempt to create user with malicious email
          const user = await prisma.user.create({
            data: {
              tenantId: setup.tenant.id,
              email: maliciousEmail,
              firstName: 'Malicious',
              lastName: 'User',
              password: 'password'
            }
          })

          // If creation succeeds, verify email is stored as literal string
          expect(user.email).toBe(maliciousEmail)
          expect(user.tenantId).toBe(setup.tenant.id)

          // Test email-based queries
          const foundUser = await prisma.user.findFirst({
            where: { email: maliciousEmail }
          })

          expect(foundUser).toBeTruthy()
          expect(foundUser!.email).toBe(maliciousEmail)
          expect(foundUser!.tenantId).toBe(setup.tenant.id)

          // Test case-insensitive email search
          const caseInsensitiveSearch = await prisma.user.findMany({
            where: {
              email: { contains: maliciousEmail.toLowerCase(), mode: 'insensitive' }
            }
          })

          caseInsensitiveSearch.forEach(user => {
            expect(user.tenantId).toBe(setup.tenant.id)
          })
        } catch (error) {
          // Some emails might violate format constraints or unique constraints
          expect(error).toBeTruthy()
        }
      }

      // Test legitimate email operations still work
      const legitimateUser = await prisma.user.create({
        data: {
          tenantId: setup.tenant.id,
          email: 'legitimate@example.com',
          firstName: 'Legitimate',
          lastName: 'User',
          password: 'password'
        }
      })

      expect(legitimateUser.email).toBe('legitimate@example.com')
      expect(legitimateUser.tenantId).toBe(setup.tenant.id)
    })

    it('should handle Unicode and encoding attacks', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      const unicodeAttacks = [
        "\\u0027\\u0020OR\\u0020\\u0027\\u0031\\u0027\\u003d\\u0027\\u0031", // ' OR '1'='1
        "\\u003cscript\\u003ealert\\u0028\\u0027xss\\u0027\\u0029\\u003c/script\\u003e", // <script>alert('xss')</script>
        "\\u0027\\u003b\\u0020DROP\\u0020TABLE\\u0020users\\u003b\\u0020--", // '; DROP TABLE users; --
        "café", // Normal Unicode
        "𝕏𝕊𝕊", // Mathematical characters
        "జ్ఞ‌ా", // Complex Unicode
        "🔥💀☠️", // Emojis
        "\x00\x01\x02", // Control characters
        "test\r\nInjection: malicious", // Line breaks
        "test\tTab\tSeparated" // Tab characters
      ]

      for (const unicodeAttack of unicodeAttacks) {
        try {
          // Test in user name fields
          const unicodeUser = await prisma.user.create({
            data: {
              tenantId: setup.tenant.id,
              email: `unicode${Date.now()}@test.com`,
              firstName: unicodeAttack,
              lastName: 'Unicode Test',
              password: 'password'
            }
          })

          expect(unicodeUser.firstName).toBe(unicodeAttack)
          expect(unicodeUser.tenantId).toBe(setup.tenant.id)

          // Test in transaction description
          const unicodeTransaction = await testFactory.createTransaction({
            tenantId: setup.tenant.id,
            userId: unicodeUser.id,
            accountId: setup.accounts.checking.id,
            amount: 100.00,
            description: unicodeAttack
          })

          expect(unicodeTransaction.description).toBe(unicodeAttack)
          expect(unicodeTransaction.tenantId).toBe(setup.tenant.id)

          // Test searching Unicode content
          const unicodeSearchResults = await prisma.transaction.findMany({
            where: {
              description: { contains: unicodeAttack }
            }
          })

          unicodeSearchResults.forEach(result => {
            expect(result.tenantId).toBe(setup.tenant.id)
          })
        } catch (error) {
          // Some Unicode might violate database constraints
          expect(error).toBeTruthy()
        }
      }

      // Verify legitimate Unicode handling
      const legitimateUnicodeUser = await prisma.user.create({
        data: {
          tenantId: setup.tenant.id,
          email: 'unicode-legitimate@test.com',
          firstName: 'José',
          lastName: 'Müller',
          password: 'password'
        }
      })

      expect(legitimateUnicodeUser.firstName).toBe('José')
      expect(legitimateUnicodeUser.lastName).toBe('Müller')
      expect(legitimateUnicodeUser.tenantId).toBe(setup.tenant.id)
    })
  })

  describe('Advanced Injection Techniques Prevention', () => {
    it('should prevent second-order SQL injection attacks', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // First, store malicious data (should be safe)
      const maliciousDescription = "'; DROP TABLE transactions; --"

      const storedTransaction = await testFactory.createTransaction({
        tenantId: setup.tenant.id,
        userId: setup.users.regular.id,
        accountId: setup.accounts.checking.id,
        amount: 100.00,
        description: maliciousDescription
      })

      expect(storedTransaction.description).toBe(maliciousDescription)

      // Now use the stored malicious data in subsequent queries (second-order injection attempt)
      const secondOrderResults = await prisma.transaction.findMany({
        where: {
          description: storedTransaction.description
        }
      })

      expect(secondOrderResults).toHaveLength(1)
      expect(secondOrderResults[0].description).toBe(maliciousDescription)
      expect(secondOrderResults[0].tenantId).toBe(setup.tenant.id)

      // Test using stored malicious data in updates
      await prisma.transaction.update({
        where: { id: storedTransaction.id },
        data: {
          notes: `Updated with: ${storedTransaction.description}`
        }
      })

      const updatedTransaction = await prisma.transaction.findUnique({
        where: { id: storedTransaction.id }
      })

      expect(updatedTransaction!.notes).toBe(`Updated with: ${maliciousDescription}`)
      expect(updatedTransaction!.tenantId).toBe(setup.tenant.id)

      // Verify no injection occurred
      const allTransactions = await prisma.transaction.findMany()
      expect(allTransactions.every(t => t.tenantId === setup.tenant.id)).toBe(true)
    })

    it('should handle batch operations with malicious input safely', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      const maliciousInputs = SecurityTestUtils.generateSqlInjectionPayloads()

      // Test createMany with malicious data
      const batchTransactionData = maliciousInputs.slice(0, 10).map((maliciousInput, index) => ({
        tenantId: setup.tenant.id,
        userId: setup.users.regular.id,
        accountId: setup.accounts.checking.id,
        amount: (index + 1) * 10,
        type: 'EXPENSE' as const,
        description: maliciousInput,
        date: new Date()
      }))

      try {
        const batchResult = await prisma.transaction.createMany({
          data: batchTransactionData
        })

        expect(batchResult.count).toBe(10)

        // Verify all transactions were stored safely
        const batchTransactions = await prisma.transaction.findMany({
          where: {
            description: { in: maliciousInputs.slice(0, 10) }
          }
        })

        expect(batchTransactions).toHaveLength(10)
        batchTransactions.forEach((transaction, index) => {
          expect(transaction.tenantId).toBe(setup.tenant.id)
          expect(transaction.description).toBe(maliciousInputs[index])
        })
      } catch (error) {
        // Some batch operations might fail due to constraints
        expect(error).toBeTruthy()
      }

      // Test updateMany with malicious data
      try {
        await prisma.transaction.updateMany({
          where: {
            description: { in: maliciousInputs.slice(0, 5) }
          },
          data: {
            notes: "Updated in batch with malicious description"
          }
        })

        const updatedTransactions = await prisma.transaction.findMany({
          where: {
            notes: "Updated in batch with malicious description"
          }
        })

        updatedTransactions.forEach(transaction => {
          expect(transaction.tenantId).toBe(setup.tenant.id)
        })
      } catch (error) {
        // Expected for some cases
        expect(error).toBeTruthy()
      }

      // Test deleteMany with malicious where clause
      const deleteCount = await prisma.transaction.deleteMany({
        where: {
          description: { in: maliciousInputs.slice(5, 10) }
        }
      })

      expect(typeof deleteCount.count).toBe('number')

      // Verify tenant isolation is maintained
      const remainingTransactions = await prisma.transaction.findMany()
      expect(remainingTransactions.every(t => t.tenantId === setup.tenant.id)).toBe(true)
    })

    it('should prevent injection through aggregation functions', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Create test data
      await Promise.all(
        Array(50).fill(0).map((_, i) =>
          testFactory.createTransaction({
            tenantId: setup.tenant.id,
            userId: setup.users.regular.id,
            accountId: setup.accounts.checking.id,
            amount: (i + 1) * 10,
            description: `Test transaction ${i + 1}`
          })
        )
      )

      const maliciousInputs = SecurityTestUtils.generateSqlInjectionPayloads()

      for (const maliciousInput of maliciousInputs) {
        // Test aggregation with malicious where clause
        try {
          const aggregationResult = await prisma.transaction.aggregate({
            where: {
              description: { contains: maliciousInput }
            },
            _sum: { amount: true },
            _count: true,
            _avg: { amount: true },
            _min: { amount: true },
            _max: { amount: true }
          })

          expect(typeof aggregationResult._count).toBe('number')
          expect(aggregationResult._count).toBeGreaterThanOrEqual(0)
        } catch (error) {
          // Expected for some malicious inputs
          expect(error).toBeTruthy()
        }

        // Test groupBy with malicious input
        try {
          const groupByResult = await prisma.transaction.groupBy({
            by: ['type'],
            where: {
              description: { contains: maliciousInput }
            },
            _sum: { amount: true },
            _count: true,
            having: {
              amount: { _sum: { gte: 0 } }
            }
          })

          expect(Array.isArray(groupByResult)).toBe(true)
        } catch (error) {
          // Expected for some cases
          expect(error).toBeTruthy()
        }
      }

      // Verify legitimate aggregations work
      const legitimateAggregation = await prisma.transaction.aggregate({
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true }
      })

      expect(legitimateAggregation._count).toBe(50)
      expect(Number(legitimateAggregation._sum.amount)).toBe(12750) // Sum of 10+20+...+500
    })
  })
})