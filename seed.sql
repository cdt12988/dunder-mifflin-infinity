INSERT INTO departments
(department_name, over_head_costs)
VALUES
('Paper & Stationary', 3500),
('Office Supplies', 2700),
('Equipment', 8600),
('Furniture', 18900);

INSERT INTO users
(user_name, user_password, permissions)
VALUES 
('guest', 'N/A', '0'),
('test_manager', 'Temp123', 1),
('test_admin', 'Temp123', 2);

UPDATE users SET id = 0 WHERE id = 1;