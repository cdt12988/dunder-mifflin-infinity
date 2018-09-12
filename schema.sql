CREATE DATABASE dunder_mifflin;

CREATE USER 'michael_scott'@'localhost' IDENTIFIED BY 'improv-king007';

GRANT ALL PRIVILEGES ON dunder_mifflin.* TO 'michael_scott'@'localhost';

USE dunder_mifflin;

CREATE TABLE departments (
	id INT NOT NULL AUTO_INCREMENT,
	department_name VARCHAR(50),
	over_head_costs DECIMAL(14,2),
	PRIMARY KEY (id)
);

CREATE TABLE products (
	id INT NOT NULL AUTO_INCREMENT,
	product_name VARCHAR(100),
	department_id INT NOT NULL,
	department_name VARCHAR(50),
	price DECIMAL(14,2),
	stock_quantity INT,
	product_sales DECIMAL(14,2),
	PRIMARY KEY (id),
	INDEX (id),
	INDEX (product_name),
	INDEX (department_id),
	FOREIGN KEY (department_id)
		REFERENCES departments(id)
);

CREATE TABLE users (
	id INT NOT NULL AUTO_INCREMENT,
	user_name VARCHAR(50) NOT NULL,
	user_password VARCHAR(60) NOT NULL,
	permissions TINYINT(1) DEFAULT 0,
	PRIMARY KEY (id)
);

CREATE TABLE purchases (
	id INT NOT NULL AUTO_INCREMENT,
	purchase_order VARCHAR(13),
	timestamp INT NOT NULL,
	user_id INT NOT NULL,
	product_id INT NOT NULL,
	product_name VARCHAR(100),
	department_id INT NOT NULL,
	price DECIMAL(14,2),
	quantity INT,
	revenue DECIMAL(14,2),
	PRIMARY KEY (id),
	INDEX (user_id),
	INDEX (product_id),
	INDEX (department_id),
	FOREIGN KEY (user_id) REFERENCES users(id),
	FOREIGN KEY (product_id) REFERENCES products(id),
	FOREIGN KEY (department_id) REFERENCES departments(id)
);