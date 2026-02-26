-- password_reset_tokens -----------------------------------------------------
CREATE TABLE password_reset_tokens (
    id           serial PRIMARY KEY,
    user_id      integer NOT NULL,
    token        text    NOT NULL,
    expires_at   timestamp NOT NULL,
    created_at   timestamp NOT NULL DEFAULT now()
);

-- categories ----------------------------------------------------------------
CREATE TABLE categories (
    id          serial PRIMARY KEY,
    name        text    NOT NULL,
    type        text    NOT NULL,  -- 'income' or 'expense'
    created_at  timestamp NOT NULL DEFAULT now()
);

-- incomes -------------------------------------------------------------------
CREATE TABLE incomes (
    id           serial PRIMARY KEY,
    user_id      integer NOT NULL,
    category_id  integer NOT NULL,
    amount       numeric(10,2) NOT NULL,
    date         timestamp NOT NULL,
    description  text,
    created_at   timestamp NOT NULL DEFAULT now()
);

-- expenses ------------------------------------------------------------------
CREATE TABLE expenses (
    id           serial PRIMARY KEY,
    user_id      integer NOT NULL,
    category_id  integer NOT NULL,
    amount       numeric(10,2) NOT NULL,
    date         timestamp NOT NULL,
    description  text,
    created_at   timestamp NOT NULL DEFAULT now()
);
