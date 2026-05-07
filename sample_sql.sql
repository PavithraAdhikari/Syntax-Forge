-- Example SQL queries you can now run:

-- Create a table and insert data
CREATE TABLE students (
    id INTEGER PRIMARY KEY,
    name TEXT,
    age INTEGER,
    grade TEXT
);

-- Insert some sample data
INSERT INTO students VALUES
(1, 'Alice', 20, 'A'),
(2, 'Bob', 19, 'B+'),
(3, 'Charlie', 21, 'A-');

-- Query the data
SELECT * FROM students;

-- Or query with conditions
SELECT name, grade FROM students WHERE age >= 20;