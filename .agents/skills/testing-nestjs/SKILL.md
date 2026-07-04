---
name: testing-nestjs
description: Best practices and patterns for NestJS testing
---

# NestJS Testing

## Description

NestJS testing with Jest, Supertest, and NestJS testing utilities. Comprehensive strategies for unit, integration, and E2E tests following the test pyramid principle.

## When to Use

- Testing NestJS applications
- Unit testing services and controllers
- Integration testing modules
- E2E testing with Supertest
- Testing with dependency injection

---

## Core Patterns

### Test Structure

```
src/
â”œâ”€â”€ user/
â”‚   â”œâ”€â”€ user.service.spec.ts
â”‚   â”œâ”€â”€ user.controller.spec.ts
â”‚   â””â”€â”€ user.module.spec.ts
â””â”€â”€ test/
    â”œâ”€â”€ unit/
    â”œâ”€â”€ integration/
    â””â”€â”€ e2e/
        â””â”€â”€ user.e2e-spec.ts
```

### Unit Test - Service

```typescript
// user.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { NotFoundException } from '@nestjs/common';

describe('UserService', () => {
  let service: UserService;
  let repository: UserRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: {
            findOne: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<UserRepository>(UserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return a user when found', async () => {
      // Arrange
      const userId = 1;
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
      };
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);

      // Act
      const result = await service.findOne(userId);

      // Assert
      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      const userId = 999;
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(userId)).rejects.toThrow(NotFoundException);
      expect(repository.findOne).toHaveBeenCalledWith(userId);
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      // Arrange
      const createUserDto = {
        email: 'new@example.com',
        name: 'New User',
      };
      const createdUser = {
        id: 1,
        ...createUserDto,
      };
      jest.spyOn(repository, 'create').mockResolvedValue(createdUser);

      // Act
      const result = await service.create(createUserDto);

      // Assert
      expect(result).toEqual(createdUser);
      expect(repository.create).toHaveBeenCalledWith(createUserDto);
    });
  });
});
```

### Unit Test - Controller

```typescript
// user.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      // Arrange
      const mockUsers = [
        { id: 1, email: 'test1@example.com', name: 'User 1' },
        { id: 2, email: 'test2@example.com', name: 'User 2' },
      ];
      jest.spyOn(service, 'findAll').mockResolvedValue(mockUsers);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toEqual(mockUsers);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      // Arrange
      const createUserDto: CreateUserDto = {
        email: 'new@example.com',
        name: 'New User',
      };
      const createdUser = { id: 1, ...createUserDto };
      jest.spyOn(service, 'create').mockResolvedValue(createdUser);

      // Act
      const result = await controller.create(createUserDto);

      // Assert
      expect(result).toEqual(createdUser);
      expect(service.create).toHaveBeenCalledWith(createUserDto);
    });
  });
});
```

### Integration Test - Module

```typescript
// user.module.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UserModule } from './user.module';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

describe('UserModule', () => {
  let module: TestingModule;
  let service: UserService;
  let repository: UserRepository;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [UserModule],
    })
      .overrideProvider(getRepositoryToken(User))
      .useValue({
        findOne: jest.fn(),
        find: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })
      .compile();

    service = module.get<UserService>(UserService);
    repository = module.get<UserRepository>(UserRepository);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should have UserService', () => {
    expect(service).toBeDefined();
  });

  it('should have UserRepository', () => {
    expect(repository).toBeDefined();
  });
});
```

### E2E Test with Supertest

```typescript
// e2e/user.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { UserService } from '../src/user/user.service';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    userService = moduleFixture.get<UserService>(UserService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database or reset state
    await userService.removeAll();
  });

  describe('/users (POST)', () => {
    it('should create a new user', () => {
      const createUserDto = {
        email: 'e2e@example.com',
        name: 'E2E Test User',
      };

      return request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.email).toBe(createUserDto.email);
          expect(res.body.name).toBe(createUserDto.name);
        });
    });

    it('should return 400 when email is invalid', () => {
      const createUserDto = {
        email: 'invalid-email',
        name: 'Test User',
      };

      return request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(400);
    });
  });

  describe('/users (GET)', () => {
    it('should return an array of users', async () => {
      // Arrange
      await userService.create({
        email: 'test1@example.com',
        name: 'User 1',
      });
      await userService.create({
        email: 'test2@example.com',
        name: 'User 2',
      });

      // Act & Assert
      return request(app.getHttpServer())
        .get('/users')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(2);
        });
    });
  });

  describe('/users/:id (GET)', () => {
    it('should return a user by id', async () => {
      // Arrange
      const createdUser = await userService.create({
        email: 'get@example.com',
        name: 'Get User',
      });

      // Act & Assert
      return request(app.getHttpServer())
        .get(`/users/${createdUser.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(createdUser.id);
          expect(res.body.email).toBe('get@example.com');
        });
    });

    it('should return 404 when user not found', () => {
      return request(app.getHttpServer())
        .get('/users/999')
        .expect(404);
    });
  });
});
```

### Testing with Guards

```typescript
// auth.guard.spec.ts
import { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';
import { Reflector } from '@nestjs/core';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AuthGuard, Reflector],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should allow access when token is valid', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: 'Bearer valid-token',
          },
        }),
      }),
    } as ExecutionContext;

    jest.spyOn(guard, 'validateToken').mockReturnValue(true);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when token is invalid', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: 'Bearer invalid-token',
          },
        }),
      }),
    } as ExecutionContext;

    jest.spyOn(guard, 'validateToken').mockReturnValue(false);

    expect(guard.canActivate(context)).toBe(false);
  });
});
```

### Testing with Pipes

```typescript
// validation.pipe.spec.ts
import { ValidationPipe } from '@nestjs/common';
import { ArgumentMetadata } from '@nestjs/common';

describe('ValidationPipe', () => {
  let pipe: ValidationPipe;
  let metadata: ArgumentMetadata;

  beforeEach(() => {
    pipe = new ValidationPipe();
  });

  it('should pass validation for valid DTO', () => {
    const dto = { email: 'test@example.com', name: 'Test' };
    metadata = {
      type: 'body',
      metatype: class CreateUserDto {},
      data: '',
    };

    expect(pipe.transform(dto, metadata)).resolves.toEqual(dto);
  });

  it('should throw BadRequestException for invalid DTO', () => {
    const dto = { email: 'invalid-email' };
    metadata = {
      type: 'body',
      metatype: class CreateUserDto {},
      data: '',
    };

    expect(pipe.transform(dto, metadata)).rejects.toThrow();
  });
});
```

### Testing with Interceptors

```typescript
// logging.interceptor.spec.ts
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logger: any;

  beforeEach(() => {
    logger = {
      log: jest.fn(),
    };
    interceptor = new LoggingInterceptor(logger);
  });

  it('should log request and response', (done) => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', url: '/users' }),
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as ExecutionContext;

    const handler: CallHandler = {
      handle: () => of({ data: 'test' }),
    };

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        expect(logger.log).toHaveBeenCalled();
        done();
      },
    });
  });
});
```

## Best Practices

1. **Test Pyramid**
   - Write more unit tests than integration tests
   - Write fewer E2E tests (only for critical paths)
   - Test independently (no shared state)
   - Keep tests fast and maintainable

2. **Mocking Strategy**
   - Mock third-party dependencies
   - Mock external services
   - Don't mock internal services unnecessarily
   - Use spies for partial mocking

3. **Test Organization**
   - Use `describe` blocks for grouping
   - Use descriptive test names (`should_ExpectedBehavior_When_StateUnderTest`)
   - Follow AAA pattern (Arrange, Act, Assert)
   - Keep tests independent

4. **Dependency Injection**
   - Use `Test.createTestingModule()` for test modules
   - Override providers with `overrideProvider()`
   - Use `get()` to retrieve services
   - Clean up with `module.close()`

5. **E2E Testing**
   - Use Supertest for HTTP testing
   - Set up and tear down test data
   - Test critical user flows
   - Use test database or in-memory database

6. **Assertions**
   - Use Jest matchers appropriately
   - Test both positive and negative cases
   - Verify method calls with `toHaveBeenCalled()`
   - Check return values and side effects

## Common Pitfalls

- **Over-mocking**: Don't mock everything, test real behavior when possible
- **Shared state**: Ensure tests are independent
- **No cleanup**: Clean up after tests (use `afterEach`, `afterAll`)
- **Slow tests**: Mock external dependencies to keep tests fast
- **Testing implementation**: Test behavior, not implementation details
- **No error cases**: Test both success and failure scenarios
- **Brittle tests**: Don't test internal implementation details

## Advanced Patterns

### Custom Test Utilities

```typescript
// test/utils/test-helpers.ts
import { TestingModule } from '@nestjs/testing';

export async function createTestModule(providers: any[]) {
  return Test.createTestingModule({
    providers,
  }).compile();
}

export function createMockRepository() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}
```

### Testing Async Operations

```typescript
it('should handle async operations', async () => {
  const promise = service.asyncOperation();
  await expect(promise).resolves.toEqual(expectedResult);
});

it('should handle async errors', async () => {
  const promise = service.failingOperation();
  await expect(promise).rejects.toThrow(Error);
});
```

### Testing with Time

```typescript
it('should handle time-based operations', () => {
  jest.useFakeTimers();
  const startTime = Date.now();
  
  // Test time-dependent code
  
  jest.advanceTimersByTime(1000);
  expect(Date.now() - startTime).toBe(1000);
  
  jest.useRealTimers();
});
```

### Testing Event Emitters

```typescript
it('should emit events', () => {
  const eventEmitter = new EventEmitter();
  const listener = jest.fn();
  
  eventEmitter.on('test', listener);
  eventEmitter.emit('test', { data: 'test' });
  
  expect(listener).toHaveBeenCalledWith({ data: 'test' });
});
```