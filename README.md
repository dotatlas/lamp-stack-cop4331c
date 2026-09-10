# Contact Manager LAMP Application

## Structure

- `public/` - Apache document root and browser-accessible assets
- `database/` - Contact Manager SQL schema, reset, and seed scripts

Configure Apache to use `public/` as the document root.

## Database Lab

Run `database/resetdb.sql` to create and seed `ContactsAppDB`. The lab user is
`ContactsAppUser` with no password.

```sql
USE ContactsAppDB;
SHOW TABLES;
DESCRIBE Users;
DESCRIBE Contacts;
SELECT * FROM Users;
SELECT * FROM Contacts;
```
