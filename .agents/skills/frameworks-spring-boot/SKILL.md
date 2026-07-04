---
name: frameworks-spring-boot
description: Best practices and patterns for Spring Boot
---

# Spring Boot

## Description

Spring Boot is an opinionated framework for building production-ready Spring applications. Provides auto-configuration, embedded servers, and production-ready features out of the box.

## When to Use

- Building REST APIs with Java
- Enterprise applications
- Microservices architecture
- Applications requiring Spring ecosystem
- Production-ready applications

---

## Core Patterns

### Project Structure

```
src/main/java/com/example/app/
â”œâ”€â”€ Application.java
â”œâ”€â”€ config/
â”‚   â””â”€â”€ SecurityConfig.java
â”œâ”€â”€ controller/
â”‚   â””â”€â”€ UserController.java
â”œâ”€â”€ service/
â”‚   â””â”€â”€ UserService.java
â”œâ”€â”€ repository/
â”‚   â””â”€â”€ UserRepository.java
â”œâ”€â”€ entity/
â”‚   â””â”€â”€ User.java
â””â”€â”€ dto/
    â”œâ”€â”€ UserRequestDto.java
    â””â”€â”€ UserResponseDto.java
```

### Main Application Class

```java
// Application.java
package com.example.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

### Controller Pattern

```java
// controller/UserController.java
package com.example.app.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.app.dto.UserRequestDto;
import com.example.app.dto.UserResponseDto;
import com.example.app.service.UserService;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {
    
    private final UserService userService;
    
    public UserController(UserService userService) {
        this.userService = userService;
    }
    
    @GetMapping
    public ResponseEntity<List<UserResponseDto>> getAllUsers() {
        return ResponseEntity.ok(userService.findAll());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<UserResponseDto> getUserById(@PathVariable Long id) {
        return userService.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<UserResponseDto> createUser(
            @Valid @RequestBody UserRequestDto userRequest) {
        UserResponseDto user = userService.create(userRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<UserResponseDto> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UserRequestDto userRequest) {
        return userService.update(id, userRequest)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (userService.delete(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
```

### Service Layer

```java
// service/UserService.java
package com.example.app.service;

import com.example.app.dto.UserRequestDto;
import com.example.app.dto.UserResponseDto;
import com.example.app.entity.User;
import com.example.app.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class UserService {
    
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    
    public UserService(UserRepository userRepository, UserMapper userMapper) {
        this.userRepository = userRepository;
        this.userMapper = userMapper;
    }
    
    public List<UserResponseDto> findAll() {
        return userRepository.findAll().stream()
            .map(userMapper::toDto)
            .collect(Collectors.toList());
    }
    
    public Optional<UserResponseDto> findById(Long id) {
        return userRepository.findById(id)
            .map(userMapper::toDto);
    }
    
    public UserResponseDto create(UserRequestDto userRequest) {
        User user = userMapper.toEntity(userRequest);
        User savedUser = userRepository.save(user);
        return userMapper.toDto(savedUser);
    }
    
    public Optional<UserResponseDto> update(Long id, UserRequestDto userRequest) {
        return userRepository.findById(id)
            .map(user -> {
                userMapper.updateEntity(user, userRequest);
                User updatedUser = userRepository.save(user);
                return userMapper.toDto(updatedUser);
            });
    }
    
    public boolean delete(Long id) {
        if (userRepository.existsById(id)) {
            userRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
```

### Repository Pattern

```java
// repository/UserRepository.java
package com.example.app.repository;

import com.example.app.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByEmail(String email);
    
    boolean existsByEmail(String email);
    
    @Query("SELECT u FROM User u WHERE u.active = true")
    List<User> findActiveUsers();
    
    @Query("SELECT u FROM User u WHERE u.name LIKE %:name%")
    List<User> findByNameContaining(@Param("name") String name);
}
```

### Entity Pattern

```java
// entity/User.java
package com.example.app.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank
    @Column(nullable = false, unique = true)
    @Email
    private String email;
    
    @NotBlank
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false)
    private Boolean active = true;
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
    
    // Constructors, getters, setters
    public User() {}
    
    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
```

### DTO Pattern

```java
// dto/UserRequestDto.java
package com.example.app.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UserRequestDto {
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;
    
    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 50, message = "Name must be between 2 and 50 characters")
    private String name;
    
    // Getters and setters
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}

// dto/UserResponseDto.java
package com.example.app.dto;

import java.time.LocalDateTime;

public class UserResponseDto {
    private Long id;
    private String email;
    private String name;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Getters and setters
    // ...
}
```

### Configuration

```yaml
# application.yml
spring:
  application:
    name: my-app
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    properties:
      hibernate:
        format_sql: true
  security:
    jwt:
      secret: ${JWT_SECRET}
      expiration: 86400000

server:
  port: 8080
  error:
    include-message: always
    include-stacktrace: on_param

logging:
  level:
    com.example.app: DEBUG
    org.springframework.web: INFO
```

### Exception Handling

```java
// exception/GlobalExceptionHandler.java
package com.example.app.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(
            ResourceNotFoundException ex) {
        ErrorResponse error = new ErrorResponse(
            HttpStatus.NOT_FOUND.value(),
            ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(
            MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        ErrorResponse error = new ErrorResponse(
            HttpStatus.INTERNAL_SERVER_ERROR.value(),
            "An error occurred"
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
```

### Security Configuration

```java
// config/SecurityConfig.java
package com.example.app.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    
    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/api/v1/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, 
                UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
}
```

## Best Practices

1. **Project Structure**
   - Place main class in root package
   - Use package-by-feature structure
   - Separate controllers, services, repositories
   - Use DTOs for request/response

2. **Dependency Injection**
   - Use constructor injection (preferred)
   - Avoid field injection
   - Use @Service, @Repository, @Component appropriately
   - Keep dependencies minimal

3. **REST API Design**
   - Use nouns for resources (`/users`, `/products`)
   - Use HTTP methods correctly (GET, POST, PUT, DELETE)
   - Return appropriate status codes
   - Version APIs (`/api/v1/users`)

4. **Validation**
   - Use Jakarta Validation annotations
   - Validate at controller level
   - Return clear error messages
   - Handle validation exceptions globally

5. **Error Handling**
   - Use @RestControllerAdvice for global exception handling
   - Create custom exceptions
   - Return consistent error responses
   - Log errors appropriately

6. **Configuration**
   - Use application.yml for configuration
   - Externalize sensitive data (environment variables)
   - Use profiles for different environments
   - Use @ConfigurationProperties for type-safe config

7. **Testing**
   - Write unit tests for services
   - Use @WebMvcTest for controller tests
   - Use @DataJpaTest for repository tests
   - Use TestContainers for integration tests

## Common Pitfalls

- **Circular dependencies**: Avoid circular references between beans
- **Missing validation**: Always validate input with Jakarta Validation
- **No exception handling**: Use @RestControllerAdvice
- **Field injection**: Prefer constructor injection
- **No transaction management**: Use @Transactional appropriately
- **N+1 queries**: Use @EntityGraph or fetch joins
- **Missing pagination**: Implement pagination for list endpoints
- **No API versioning**: Version your APIs from the start

## Advanced Patterns

### Custom Query Methods

```java
// Repository with custom query
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    @Query("SELECT u FROM User u WHERE u.email = :email AND u.active = true")
    Optional<User> findActiveUserByEmail(@Param("email") String email);
    
    @Modifying
    @Query("UPDATE User u SET u.active = false WHERE u.id = :id")
    void deactivateUser(@Param("id") Long id);
}
```

### Pagination

```java
// Controller with pagination
@GetMapping
public ResponseEntity<Page<UserResponseDto>> getAllUsers(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(defaultValue = "id") String sortBy) {
    Pageable pageable = PageRequest.of(page, size, Sort.by(sortBy));
    Page<UserResponseDto> users = userService.findAll(pageable);
    return ResponseEntity.ok(users);
}
```

### Caching

```java
// Service with caching
@Service
public class UserService {
    
    @Cacheable(value = "users", key = "#id")
    public Optional<UserResponseDto> findById(Long id) {
        // ...
    }
    
    @CacheEvict(value = "users", key = "#id")
    public Optional<UserResponseDto> update(Long id, UserRequestDto dto) {
        // ...
    }
}
```

### Async Processing

```java
// Service with async
@Service
public class EmailService {
    
    @Async
    public CompletableFuture<Void> sendEmail(String to, String subject, String body) {
        // Send email asynchronously
        return CompletableFuture.completedFuture(null);
    }
}
```