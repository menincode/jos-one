---
name: databases-rabbitmq
description: Best practices and patterns for RabbitMQ
---

# RabbitMQ

## Description

RabbitMQ is a message broker that implements the Advanced Message Queuing Protocol (AMQP). Provides reliable message delivery, routing, and queuing for distributed systems.

## When to Use

- Task queues and background job processing
- Microservices communication
- Event-driven architecture
- Request/response patterns
- Work distribution
- Decoupling services

---

## Core Patterns

### Basic Publishing

```python
import pika

# Connection
connection = pika.BlockingConnection(
    pika.ConnectionParameters('localhost')
)
channel = connection.channel()

# Declare queue (idempotent)
channel.queue_declare(
    queue='task_queue',
    durable=True  # Survive broker restart
)

# Publish message
channel.basic_publish(
    exchange='',
    routing_key='task_queue',
    body='Task message',
    properties=pika.BasicProperties(
        delivery_mode=2,  # Make message persistent
        priority=5,  # Message priority
        expiration='60000'  # TTL in milliseconds
    )
)

connection.close()
```

### Basic Consuming

```python
# Consumer with acknowledgements
def callback(ch, method, properties, body):
    try:
        # Process message
        process_task(body)
        # Acknowledge after successful processing
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        # Reject and requeue on failure
        ch.basic_nack(
            delivery_tag=method.delivery_tag,
            requeue=True  # or False for dead-letter
        )

channel.basic_consume(
    queue='task_queue',
    on_message_callback=callback,
    auto_ack=False  # Manual acknowledgement
)

channel.start_consuming()
```

### Publisher Confirms

```python
# Enable publisher confirms
channel.confirm_delivery()

def on_delivery_confirmation(method_frame):
    if method_frame.method.NAME == 'Basic.Ack':
        print('Message delivered')
    else:
        print('Message not delivered')

channel.add_on_return_callback(on_delivery_confirmation)

# Publish with confirmation
if channel.basic_publish(
    exchange='',
    routing_key='task_queue',
    body='Message',
    mandatory=True  # Return if unroutable
):
    print('Message published')
else:
    print('Message not published')
```

### Exchange Types

```python
# Direct exchange (routing by key)
channel.exchange_declare(
    exchange='direct_logs',
    exchange_type='direct'
)
channel.basic_publish(
    exchange='direct_logs',
    routing_key='error',  # Routes to queues bound with 'error'
    body='Error message'
)

# Topic exchange (pattern matching)
channel.exchange_declare(
    exchange='topic_logs',
    exchange_type='topic'
)
channel.basic_publish(
    exchange='topic_logs',
    routing_key='logs.error.app',  # Pattern: *.error.*
    body='Error message'
)

# Fanout exchange (broadcast)
channel.exchange_declare(
    exchange='fanout_logs',
    exchange_type='fanout'
)
channel.basic_publish(
    exchange='fanout_logs',
    routing_key='',  # Ignored for fanout
    body='Broadcast message'
)

# Headers exchange (routing by headers)
channel.exchange_declare(
    exchange='headers_logs',
    exchange_type='headers'
)
channel.basic_publish(
    exchange='headers_logs',
    routing_key='',
    body='Message',
    properties=pika.BasicProperties(
        headers={'x-match': 'all', 'level': 'error', 'app': 'web'}
    )
)
```

### Queue Configuration

```python
# Durable queue (survives broker restart)
channel.queue_declare(
    queue='durable_queue',
    durable=True
)

# Exclusive queue (deleted when connection closes)
channel.queue_declare(
    queue='temp_queue',
    exclusive=True
)

# Queue with TTL
channel.queue_declare(
    queue='ttl_queue',
    arguments={'x-message-ttl': 60000}  # 60 seconds
)

# Queue with max length
channel.queue_declare(
    queue='limited_queue',
    arguments={'x-max-length': 1000}  # Max 1000 messages
)

# Priority queue
channel.queue_declare(
    queue='priority_queue',
    arguments={'x-max-priority': 10}  # Max priority level
)

# Dead letter queue
channel.queue_declare(
    queue='dlq',
    durable=True
)
channel.queue_declare(
    queue='main_queue',
    arguments={
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': 'dlq'
    }
)
```

### Work Queue Pattern

```python
# Producer
channel.basic_publish(
    exchange='',
    routing_key='task_queue',
    body='Task 1',
    properties=pika.BasicProperties(
        delivery_mode=2,  # Persistent
    )
)

# Consumer with fair dispatch
channel.basic_qos(
    prefetch_count=1  # Don't dispatch new message until ack
)
channel.basic_consume(
    queue='task_queue',
    on_message_callback=callback,
    auto_ack=False
)
```

### RPC Pattern

```python
# RPC Server
def on_request(ch, method, props, body):
    response = process_rpc(body)
    ch.basic_publish(
        exchange='',
        routing_key=props.reply_to,
        properties=pika.BasicProperties(
            correlation_id=props.correlation_id
        ),
        body=str(response)
    )
    ch.basic_ack(delivery_tag=method.delivery_tag)

channel.basic_consume(
    queue='rpc_queue',
    on_message_callback=on_request
)

# RPC Client
result = channel.queue_declare(queue='', exclusive=True)
callback_queue = result.method.queue

def on_response(ch, method, props, body):
    if props.correlation_id == corr_id:
        response = body

channel.basic_consume(
    queue=callback_queue,
    on_message_callback=on_response,
    auto_ack=True
)

corr_id = str(uuid.uuid4())
channel.basic_publish(
    exchange='',
    routing_key='rpc_queue',
    properties=pika.BasicProperties(
        reply_to=callback_queue,
        correlation_id=corr_id,
    ),
    body='Request'
)
```

## Best Practices

1. **Connection Management**
   - Use connection pooling
   - Reuse connections (don't open/close per message)
   - Handle connection failures gracefully
   - Use heartbeats to detect dead connections

2. **Message Durability**
   - Use durable queues for important messages
   - Set `delivery_mode=2` for persistent messages
   - Use publisher confirms for guaranteed delivery
   - Enable consumer acknowledgements

3. **Error Handling**
   - Use dead-letter queues for failed messages
   - Implement retry logic with exponential backoff
   - Log all message processing errors
   - Monitor queue lengths and consumer status

4. **Performance**
   - Use `prefetch_count` to control message distribution
   - Batch operations when possible
   - Use multiple consumers for parallel processing
   - Monitor queue depths and processing rates

5. **Production Deployment**
   - Use quorum queues for high availability
   - Enable clustering for fault tolerance
   - Set up monitoring and alerts
   - Use durable storage (not transient)
   - Configure resource limits (memory, disk)

## Common Pitfalls

- **No acknowledgements**: Messages lost on consumer crash
- **No publisher confirms**: Don't know if message was delivered
- **Unlimited prefetch**: One slow consumer blocks others
- **No dead-letter queue**: Failed messages lost
- **Non-durable queues**: Messages lost on broker restart
- **Connection per message**: Poor performance
- **No monitoring**: Can't detect issues
- **Transient storage in production**: Performance issues on restart

## Advanced Patterns

### Quorum Queues (High Availability)

```python
# Quorum queue (recommended for production)
channel.queue_declare(
    queue='quorum_queue',
    durable=True,
    arguments={'x-queue-type': 'quorum'}
)
```

### Streams (Alternative to Queues)

```python
# Stream for append-only log
channel.queue_declare(
    queue='event_stream',
    arguments={'x-queue-type': 'stream'}
)

# Consume from stream with offset
channel.basic_consume(
    queue='event_stream',
    on_message_callback=callback,
    arguments={'x-stream-offset': 'first'}  # or 'last', offset number
)
```

### Message Priority

```python
# Publish with priority
channel.basic_publish(
    exchange='',
    routing_key='priority_queue',
    body='High priority task',
    properties=pika.BasicProperties(
        priority=10  # Higher priority processed first
    )
)
```

### Delayed Messages

```python
# Using delayed message exchange plugin
channel.exchange_declare(
    exchange='delayed_exchange',
    exchange_type='x-delayed-message',
    arguments={'x-delayed-type': 'direct'}
)

channel.basic_publish(
    exchange='delayed_exchange',
    routing_key='delayed_queue',
    body='Delayed message',
    properties=pika.BasicProperties(
        headers={'x-delay': 5000}  # Delay 5 seconds
    )
)
```