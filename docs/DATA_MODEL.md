# Data model

## Principle

Persist source data, not derived statistics.

Do not store:

- best;
- mean;
- ao5;
- ao12;
- ao100.

Calculate them from solves.

## MVP local entities

### Solve

```text
Solve

id              UUID
event           string
scramble        string
raw_time_ms     integer
penalty         enum
note            nullable string
created_at      timestamp
```

Penalty:

```text
NONE
PLUS_TWO
DNF
```

## Future backend entities

### User

```text
id
email
password_hash
created_at
updated_at
```

Never store plaintext passwords.

### Session

```text
id
user_id
name
event
created_at
updated_at
```

Examples:

```text
3x3 Main
OH Practice
BLD
Morning Practice
```

### Solve

Future server-side version:

```text
id
user_id
session_id
event
scramble
raw_time_ms
penalty
note
created_at
updated_at
```

Client-generated UUID should be accepted so offline-created solves can synchronize without replacing their identity.

### UserSettings

Possible future fields:

```text
id
user_id
theme
timer_hold_ms
inspection_enabled
created_at
updated_at
```

### LetterScheme

Future BLD entity.

```text
id
user_id
name
is_default
created_at
updated_at
```

### LetterAssignment

Future BLD entity.

Represents a letter assigned to a specific sticker/target.

Do not design the exact cube sticker identifier format until BLD domain modeling begins.

## Synchronization

Future synchronization should be designed around stable UUIDs and update timestamps.

Do not implement a complicated distributed conflict resolution system during MVP.

A simple last-write/update strategy may be evaluated when synchronization is implemented.
