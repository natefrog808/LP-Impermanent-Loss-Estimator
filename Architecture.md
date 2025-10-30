# System Architecture

## High-Level Architecture

```mermaid
graph TB
    User[User/Agent] --> API[Agent-Kit API]
    API --> Handler[calculate_il Handler]
    Handler --> Validator[Input Validator<br/>Zod Schema]
    Validator --> PriceFetcher[Price Data Fetcher]
    PriceFetcher --> CoinGecko[CoinGecko API]
    CoinGecko --> Calculator[IL Calculator]
    Calculator --> ILEngine[IL Formula Engine]
    Calculator --> PoolClassifier[Pool Type Classifier]
    PoolClassifier --> FeeEstimator[Fee APR Estimator]
    FeeEstimator --> Analyzer[Profitability Analyzer]
    Analyzer --> Response[Response Builder]
    Response --> User
```

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant Validator
    participant CoinGecko
    participant Calculator
    participant Response

    User->>API: POST /calculate_il
    API->>Validator: Validate Input
    Validator->>Calculator: Valid Request
    Calculator->>CoinGecko: Fetch Token0 Prices
    CoinGecko-->>Calculator: Historical Prices
    Calculator->>CoinGecko: Fetch Token1 Prices
    CoinGecko-->>Calculator: Historical Prices
    Calculator->>Calculator: Calculate Price Ratio
    Calculator->>Calculator: Compute IL
    Calculator->>Calculator: Classify Pool Type
    Calculator->>Calculator: Estimate Fee APR
    Calculator->>Calculator: Generate Warnings
    Calculator->>Response: Build Output
    Response->>User: Return Results
```

## Component Architecture

```mermaid
graph LR
    A[Agent-Kit Framework] --> B[Entrypoints]
    B --> C[calculate_il]
    B --> D[echo]
    B --> E[health]
    
    C --> F[Core Logic]
    F --> G[calculateImpermanentLoss]
    F --> H[fetchHistoricalPrices]
    F --> I[estimatePoolMetrics]
    F --> J[estimateFeeAPR]
    
    H --> K[CoinGecko API]
    I --> L[Pool Classification Rules]
    
    style A fill:#e1f5ff
    style C fill:#fff4e1
    style F fill:#ffe1f5
    style K fill:#e1ffe1
```

## IL Calculation Flow

```mermaid
flowchart TD
    Start[Start] --> Input[Receive Token Pair & Amounts]
    Input --> Fetch[Fetch Historical Prices]
    Fetch --> CalcRatio[Calculate Price Ratios]
    CalcRatio --> Initial[Initial Ratio = Price0/Price1 at t0]
    Initial --> Final[Final Ratio = Price0/Price1 at t1]
    Final --> PriceChange[Price Ratio = Final/Initial]
    PriceChange --> ILFormula[Apply IL Formula]
    ILFormula --> ILResult[IL = 2√r / 1+r - 1]
    ILResult --> CheckIL{IL > -5%?}
    CheckIL -->|Yes| LowIL[Low IL Warning]
    CheckIL -->|No| HighIL[High IL Warning]
    LowIL --> Continue
    HighIL --> Continue
    Continue[Continue to Fee Estimation]
    
    style Start fill:#90EE90
    style ILFormula fill:#FFB6C1
    style ILResult fill:#FFD700
    style HighIL fill:#FF6B6B
    style LowIL fill:#4ECDC4
```

## Pool Type Classification

```mermaid
graph TD
    A[Token Pair Input] --> B{Both Stablecoins?}
    B -->|Yes| C[Stablecoin Pool<br/>0.05% fee, 0.5 ratio]
    B -->|No| D{ETH + Stablecoin?}
    D -->|Yes| E[ETH/Stable Pool<br/>0.30% fee, 1.2 ratio]
    D -->|No| F{ETH + BTC?}
    F -->|Yes| G[ETH/BTC Pool<br/>0.30% fee, 0.8 ratio]
    F -->|No| H{Both Major Tokens?}
    H -->|Yes| I[Major/Major Pool<br/>0.30% fee, 0.6 ratio]
    H -->|No| J{Major + Stable?}
    J -->|Yes| K[Major/Stable Pool<br/>0.30% fee, 0.7 ratio]
    J -->|No| L[Default Pool<br/>0.30% fee, 0.3 ratio]
    
    style C fill:#E8F5E9
    style E fill:#E3F2FD
    style G fill:#FFF3E0
    style I fill:#F3E5F5
    style K fill:#E0F2F1
    style L fill:#EEEEEE
```

## Fee APR Calculation

```mermaid
graph LR
    A[Pool Metrics] --> B[Daily Volume]
    A --> C[Pool TVL]
    A --> D[Fee Tier]
    
    B --> E[Annual Volume<br/>= Daily × 365]
    D --> F[Annual Fees<br/>= Volume × Fee Tier]
    
    E --> F
    C --> G[Fee APR<br/>= Annual Fees / TVL × 100]
    F --> G
    
    style A fill:#E1F5FE
    style G fill:#C8E6C9
```

## Profitability Analysis

```mermaid
flowchart TD
    A[Calculate IL] --> B[Annualize IL<br/>IL × 365/days]
    C[Calculate Fee APR] --> D[Compare]
    B --> D
    D --> E{Fee APR > |IL|?}
    E -->|Yes| F[✅ Profitable Position<br/>Net APR = Fee APR + IL]
    E -->|No| G[⚠️ Losing Position<br/>IL exceeds fees]
    
    F --> H[Generate Positive Notes]
    G --> I[Generate Warning Notes]
    
    H --> J[Return Results]
    I --> J
    
    style F fill:#4CAF50
    style G fill:#FF5252
    style J fill:#2196F3
```

## System Boundaries

```mermaid
graph TB
    subgraph "LP IL Estimator"
        A[Agent-Kit Server]
        B[IL Calculator]
        C[Pool Classifier]
        D[Fee Estimator]
    end
    
    subgraph "External Services"
        E[CoinGecko API]
        F[User/Client]
    end
    
    F -->|HTTP/x402| A
    A --> B
    B --> C
    C --> D
    B -->|Price Data| E
    D -->|Results| F
    
    style A fill:#42A5F5
    style B fill:#66BB6A
    style E fill:#FFA726
```

## Deployment Architecture (Example: Vercel)

```mermaid
graph TB
    A[Developer] -->|git push| B[GitHub Repo]
    B -->|webhook| C[Vercel Build]
    C -->|deploy| D[Vercel Edge Network]
    
    E[User] -->|HTTPS request| D
    D -->|serverless function| F[Agent-Kit Instance]
    F -->|API call| G[CoinGecko]
    G -->|price data| F
    F -->|response| D
    D -->|JSON| E
    
    style B fill:#E8EAF6
    style C fill:#C5CAE9
    style D fill:#9FA8DA
    style F fill:#7986CB
```

## Error Handling Flow

```mermaid
flowchart TD
    A[Request Received] --> B{Valid Input?}
    B -->|No| C[Zod Validation Error]
    B -->|Yes| D[Fetch Prices]
    D --> E{CoinGecko Success?}
    E -->|No| F[API Error]
    E -->|Yes| G[Calculate IL]
    G --> H{Calculation Success?}
    H -->|No| I[Math Error]
    H -->|Yes| J[Generate Response]
    
    C --> K[Error Response]
    F --> K
    I --> K
    J --> L[Success Response]
    
    K --> M[Return to User]
    L --> M
    
    style C fill:#FFCDD2
    style F fill:#FFCDD2
    style I fill:#FFCDD2
    style J fill:#C8E6C9
    style L fill:#A5D6A7
```

## Data Model

```mermaid
classDiagram
    class CalculateILInput {
        +string pool_address?
        +string token0_symbol
        +string token1_symbol
        +number[] token_weights
        +number[] deposit_amounts
        +number window_hours
    }
    
    class CalculateILOutput {
        +number IL_percent
        +number fee_apr_est
        +number net_apr_est
        +number volume_window
        +number price_change_percent
        +number il_annualized_percent
        +number estimated_tvl
        +number estimated_daily_volume
        +number fee_tier_percent
        +string[] notes
    }
    
    class PriceData {
        +number initialRatio
        +number finalRatio
        +Array prices
    }
    
    class PoolMetrics {
        +number estimatedTVL
        +number estimatedDailyVolume
        +number feeTier
    }
    
    class ILResult {
        +number ilPercent
        +number hodlValue
        +number lpValue
    }
    
    CalculateILInput --> PriceData : fetches
    PriceData --> ILResult : calculates
    CalculateILInput --> PoolMetrics : estimates
    PoolMetrics --> CalculateILOutput : contributes to
    ILResult --> CalculateILOutput : contributes to
```

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Validating : Request Received
    Validating --> Fetching : Input Valid
    Validating --> Error : Invalid Input
    Fetching --> Calculating : Prices Retrieved
    Fetching --> Error : API Failure
    Calculating --> Analyzing : IL Computed
    Analyzing --> Responding : Analysis Complete
    Responding --> Idle : Response Sent
    Error --> Idle : Error Response Sent
```

## Technology Stack

```mermaid
graph TB
    A[LP IL Estimator] --> B[Runtime Layer]
    A --> C[Framework Layer]
    A --> D[Data Layer]
    A --> E[Protocol Layer]
    
    B --> B1[Node.js 18+]
    B --> B2[TypeScript 5.3]
    
    C --> C1[@lucid-dreams/agent-kit]
    C --> C2[Zod Validation]
    
    D --> D1[CoinGecko API]
    D --> D2[In-Memory Cache]
    
    E --> E1[HTTP/HTTPS]
    E --> E2[x402 Protocol]
    
    style A fill:#1976D2
    style B fill:#388E3C
    style C fill:#F57C00
    style D fill:#7B1FA2
    style E fill:#C2185B
```

---

## Key Design Decisions

### 1. **Pure Calculation Engine**
No database required - stateless design makes it easy to scale and deploy anywhere.

### 2. **Intelligent Heuristics**
Pool classification uses token pair analysis to estimate realistic volumes and fees without on-chain data.

### 3. **Real Price Data**
CoinGecko integration ensures calculations reflect actual market conditions, not simulated data.

### 4. **Conservative Estimates**
Volume and TVL estimates are conservative to avoid overpromising returns.

### 5. **Comprehensive Output**
Returns not just IL, but net profitability, warnings, and actionable insights.

### 6. **Error Resilience**
Graceful degradation - returns partial results even if some data is unavailable.

---

## Performance Characteristics

- **Average Response Time**: 1-3 seconds (dominated by CoinGecko API)
- **Memory Usage**: <50MB per instance
- **Concurrent Requests**: Limited by CoinGecko rate limits (10-50/min)
- **Scalability**: Stateless design enables horizontal scaling

---

## Future Architecture Considerations

```mermaid
graph TB
    subgraph "Current Architecture"
        A[Agent] --> B[CoinGecko API]
    end
    
    subgraph "Future Enhancements"
        C[Agent] --> D[Cache Layer<br/>Redis]
        D --> E[CoinGecko API]
        C --> F[On-Chain Data<br/>The Graph]
        C --> G[Historical DB<br/>PostgreSQL]
    end
    
    style A fill:#90CAF9
    style C fill:#A5D6A7
```

**Potential Improvements:**
- Redis caching for frequently requested pairs
- The Graph for real-time on-chain data
- PostgreSQL for historical calculations
- WebSocket updates for live positions
- Concentrated liquidity support (Uniswap V3)
