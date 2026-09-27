export const sequenceSource = `sequenceDiagram
    autonumber
    actor User
    participant App as Web application
    participant API as API gateway
    participant Auth as Identity service
    participant Orders as Order service
    participant DB as Database
    participant Pay as Payment provider
    participant Queue as Event queue
    participant Stock as Inventory service
    participant Mail as Notification service

    Note over User,Mail: A complete order journey — request, payment, fulfillment, and recovery
    User->>App: Review cart and checkout
    App->>API: POST /checkout with session token
    API->>Auth: Validate session and permissions
    Auth->>DB: Look up user and session
    DB-->>Auth: Active session
    Auth-->>API: Verified user
    API->>Orders: Create order (idempotency key)
    Orders->>DB: Check for an existing request
    alt Request already processed
        DB-->>Orders: Existing order
        Orders-->>API: Return original result
        API-->>App: Order status
    else New checkout
        DB-->>Orders: No duplicate found
        Orders->>Stock: Reserve cart items (10 minute TTL)
        Stock->>DB: Atomically reserve available stock
        DB-->>Stock: Reservation confirmed
        Stock-->>Orders: Reservation ID
        Orders->>DB: Save pending order
        Orders->>Pay: Authorize payment (idempotency key)
        alt Payment authorized
            Pay-->>Orders: Authorization ID
            Orders->>Pay: Capture authorized payment
            Pay-->>Orders: Payment captured
            Orders->>DB: Transaction: mark paid and write outbox event
            DB-->>Orders: Transaction committed
            Orders-->>API: Order confirmed
            API-->>App: 201 Created
            App-->>User: Show confirmation and tracking link
            loop Outbox delivery until acknowledged
                Orders->>DB: Read undelivered events
                DB-->>Orders: OrderPaid event
                Orders->>Queue: Publish OrderPaid (event ID)
                Queue-->>Orders: Acknowledged
                Orders->>DB: Mark event delivered
            end
            par Fulfill the order
                Queue->>Stock: Consume OrderPaid (deduplicate event ID)
                Stock->>DB: Commit reservation and create shipment
                DB-->>Stock: Shipment created
                Stock-->>Queue: Acknowledge fulfillment
            and Send the receipt
                Queue->>Mail: Consume OrderPaid (deduplicate event ID)
                Mail->>DB: Read order and customer details
                DB-->>Mail: Receipt data
                Mail-->>User: Email receipt and next steps
                Mail-->>Queue: Acknowledge notification
            end
        else Payment declined
            Pay-->>Orders: Declined with reason
            Orders->>Stock: Release reserved items
            Stock->>DB: Restore available inventory
            Orders->>DB: Mark order as payment failed
            Orders-->>API: Payment failed
            API-->>App: Action required
            App-->>User: Choose another payment method
        end
    end
    Note over User,Mail: Every stage is observable with a shared correlation ID`;
