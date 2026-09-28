- `public/` - Apache document root and browser-accessible assets
- `database/` - Contact Manager SQL schema, reset, and seed scripts

Configure Apache to use `public/` as the document root.

Run `database/resetdb.sql` to create and seed `ContactsAppDB`. The lab user is
`ContactsAppUser` with password `pw`.

```sql
USE ContactsAppDB;
SHOW TABLES;
DESCRIBE Users;
DESCRIBE Contacts;
SELECT * FROM Users;
SELECT * FROM Contacts;
```

## AI Assistance Disclosure

This project was developed with assistance from generative AI tools:

- **Tool**: Claude Sonnet 5 (Anthropic, claude.ai)
- **Dates**: September 23-24, 27, 2026
- **Scope**: Frontend interface styling and alignment troubleshooting for form fields
- **Use**: Generated the complete `styles.css` file based on existing HTML files and aligned form containers in HTML files

All AI-generated code was reviewed, tested, and modified to meet 
assignment requirements. Final implementation reflects my understanding 
of the concepts.
