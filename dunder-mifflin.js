//	Set package requirements
var inquirer = require('inquirer');
var mysql = require('mysql');
var moment = require('moment');
var Table = require('terminal-table');
var bcrypt = require('bcrypt');
//	Set the number of salt rounds for password hashing
const saltRounds = 10;
//	Create connection to DB using credentials
/*
var db = mysql.createConnection({
	host: 'localhost',
	user: 'bamazon_admin',
	password: 'secret',
	database: 'bamazon'
});
*/
var db = mysql.createConnection({
	host: 'localhost',
	user: 'michael_scott',
	password: 'improv-king007',
	database: 'dunder_mifflin'
});
//	Connect to DB and start the application
db.connect(function(err) {
	if(err) throw err;
	start();
});

//	Lists starting options for user
function start() {
	console.log('\n----- WELCOME TO DUNDER-MIFFLIN -----\n');
	inquirer.prompt([
		{
			message: 'Choose an option below\n',
			name: 'option',
			type: 'list',
			choices: ['Create Account', 'Login', 'Continue as a guest', 'Exit']
		}
	]).then(function(answer) {
		switch(answer.option) {
			case 'Create Account':
				createAccount.promptUsername();
			break;
			case 'Login':
				login.promptUsername();
			break;
			case 'Continue as a guest':
				storefront.landingPage();
			break;
			case 'Exit':
				if(user.login) {
					console.log('\nGoodbye, ' + user.username + '!\n');
				} else {
					console.log('\Goodbye!\n');
				}
				db.end();
			break;
		}
	});
}

//	User object to track user login status and credentials
var user = {
	username: '',
	id: null,
	password: '',
	login: false,
	permissions: 0,
	viewPurchaseHistory: function() {
		console.log('\n----- PURCHASE HISTORY -----\n');
		if(user.login) {
			var sql = 'SELECT * FROM purchases WHERE ?';
			var query = db.query(
				sql,
				{
					user_id: user.id
				},
				function(err, res) {
					if(err) throw err;
					if(res === undefined || res.length == 0) {
						console.log('Purchase history is empty\n');
						storefront.landingPage();
					} else {
// 						console.log(res);
						var orders = [];
						var dates = [];
						var temp = [];
						res.forEach(function(purchase) {
							if(temp.indexOf(purchase.purchase_order) < 0) {
// 								orders.push(purchase);
// 								orders.push(purchase.purchase_order + ' (' + moment(purchase.timestamp, 'X').format('MM-DD-YYYY') + ')');
								orders.push(moment(purchase.timestamp, 'X').format('MM-DD-YYYY') + '  ' + purchase.purchase_order);
								temp.push(purchase.purchase_order);
// 								dates.push(moment(purchase.timestamp, 'X').format('MM-DD-YYYY'));
// 								console.log(purchase.(timestamp)
// 								console.log(orders.indexOf(purchase));
							}
						});
						orders.push('Back');
						inquirer.prompt([
							{
								name: 'order',
								message: '  DATE      ORDER NUMBER\n----------------------------',
								type: 'list',
								choices: orders
							}
						]).then(function(answer) {
							if(answer.order == 'Back') {
								storefront.landingPage();
							} else {
								var totalPrice = 0;
								var arr = answer.order.split(' ');
								var order = arr[2];
								var sql = 'SELECT * FROM purchases WHERE ?';
								var query = db.query(
									sql,
									{
										purchase_order: order
									},
									function(err, res) {
										if(err) throw err;
										var table = new Table({horizontalLine: true, leftPadding: 2, rightPadding: 2});
										table.push(['Date', 'Product ID', 'Product Name', 'Quantity', 'Price']);
										res.forEach(function(purchase) {
											table.push([moment(purchase.timestamp, 'X').format('MM-DD-YYYY'), purchase.product_id, purchase.product_name, purchase.quantity, purchase.price]);
											totalPrice += purchase.revenue;
										});
										table.push(['TOTAL:', '', '', '', totalPrice]);
										console.log('\n--------------------- PURCHASE ORDER ' + order + ' ---------------------');
										console.log('' + table);
										inquirer.prompt([
											{
												name: 'back',
												message: '-----',
												type: 'list',
												choices: ['Back to Purchase History']
											}
										]).then(function(answer) {
											user.viewPurchaseHistory();
										});
									}
								)
							}
						});
					}
				}
			);
		} else {
			console.log('Must be logged in to view purchase history\n');
			storefront.landingPage();
		}
	}
}

//	Object holding all of the Account Creation methods
var createAccount = {
	username: '',
	//	Prompts for Username and validates it before performing DB query to see if user already exists or not
	//	If not, proceeds to prompt for user password
	promptUsername: function(admin = false) {
		console.log('\n----- CREATE ACCOUNT -----\n');
		inquirer.prompt([
			{
				name: 'username',
				message: 'Enter a username',
				validate: function(username) {
					if(/^[A-Za-z0-9_]*$/.test(username) && username.length > 5 && username.length < 50) {
						return true;
					} else {
						return false;
					}
				}
			}
		]).then(function(answer) {
			var sql = 'SELECT 1 FROM users WHERE ?';
			var query = db.query(
				sql,
				{
					user_name: answer.username.toLowerCase()
				},
				function(err, res) {
					if(err) throw err;
					createAccount.username = answer.username;
					if(res === undefined || res.length == 0) {
// 						user.username = answer.username;
						createAccount.promptPassword(admin);
					} else {
						console.log('\n' + answer.username + ' already exists.\n');
						createAccount.promptUsername(admin);
					}
				}
			);
	
		});
	},
	//	Prompts, validates and confirms user password
	promptPassword: function(admin = false) {
		inquirer.prompt([
			{
				name: 'password',
				message: 'Enter a password',
				type: 'password',
				mask: '*',
				validate: function(password) {
					if(password.trim() == '' || !/(?=.*[0-9A-Z])/.test(password) || !/(?=^\S*$)/.test(password) || !/(^.{5,20}$)/.test(password)) {
						return false;
					} else {
						return true;
					}
				}
			},
			{
				name: 'confirm_password',
				message: 'Confirm password',
				type: 'password',
				mask: '*'
			}
		]).then(function(answer) {
			if(answer.password != answer.confirm_password) {
				console.log('\nPasswords do not match\n');
				createAccount.promptPassword(admin);
			} else {
				//	Hashes password and stores the hashed password in the DB along with the username and default permissions of 0
				//	Also updates the script's user information and redirects to the Storefront Landing Page
				bcrypt.hash(answer.password, saltRounds, function(error, hash) {
					var sql = 'INSERT INTO users SET ?';
					var query = db.query(
						sql,
						{
							user_name: createAccount.username,
							user_password: hash,
							permissions: 0
						},
						function(err, res) {
							if(err) throw err;
							if(!admin) {
								user.username = createAccount.username,
								user.login = true;
								user.id = res.insertId;
								user.password = hash;
								storefront.landingPage();
							} else {
								console.log('\nUser created\n');
								createAccount.manageUsers();
							}
						}
					);
				});
			}
		});
	},
	manageUsers: function() {
		admin.manageUsers();
	}
}

//	Object holding all of the User Login methods
var login = {
	//	Prompts for Username and queries DB for user info, if it exists
	//	If user exists, updates the script's user info and prompts for user password
	promptUsername: function() {
		console.log('\n----- LOGIN -----\n');
		inquirer.prompt([
			{
				name: 'username',
				message: 'Enter your username'
			}
		]).then(function(answer) {
			var sql = 'SELECT * FROM users WHERE ?';
			var query = db.query(
				sql,
				{
					user_name: answer.username.toLowerCase()
				},
				function(err, res) {
					if(err) throw err;
					if(res === undefined || res.length == 0) {
						console.log('\nUsername not found\n');
						start();
					} else if(parseInt(res[0].permissions) < 0) {
						console.log('\nThat user is currently inactive\n');
						return start();
					} else if(res[0].id == 0) {
						console.log('\nContinuing as a guest\n');
						storefront.landingPage();
					} else {
						user.id = res[0].id;
						user.username = res[0].user_name;
						user.password = res[0].user_password;
						user.permissions = res[0].permissions;
						login.promptPassword();
					}
				}
			);
		});
	},
	//	Prompts for user password
	promptPassword: function() {
		inquirer.prompt([
			{
				name: 'password',
				message: 'Enter your password',
				type: 'password',
				mask: '*'
			}
		]).then(function(answer) {
			//	Compares the given plain text password with the hashed password and redirects accordingly, resetting script's user info if passwords do not match
			bcrypt.compare(answer.password, user.password, function(err, res) {
				if(res) {
					if(user.permissions == 0) {
						console.log('\nLogged in as: ' + user.username);
						user.login = true;
						storefront.landingPage();
					} else if(user.permissions == 1) {
						console.log('\nLogged in as: ' + user.username + ' (Manager)');
						user.login = true;
						admin.managerView();
					} else if(user.permissions == 2) {
						console.log('\nLogged in as: ' + user.username + ' (System Administrator)');
						user.login = true;
						admin.managerView();
					}
				} else {
					console.log('\nUsername and password do not match\n');
					user.id = null;
					user.username = '';
					user.password = '';
					user.login = false;
					user.permissions = 0;
					start();
				}
			});
		});
	},
	//	"Logs user out" by resetting the script's user info, emptying the shopping cart and redirecting to the start of the application
	logout: function() {
		user.id = null;
		user.username = '';
		user.password = '';
		user.login = false;
		user.permissions = 0;
		storefront.shoppingCart = [];
		start();
	}
};

//	Object holding User Profile methods
var profile = {
	//	Displays the options to edit profile or go back to the Storefront Landing Page
	editProfile: function() {
		console.log('\n----- EDIT PROFILE (' + user.username.toUpperCase() + ') -----\n');
		inquirer.prompt([
			{
				name: 'option',
				message: 'What would you like to do?',
				type: 'list',
				choices: ['Change Username', 'Change Password', 'Back']
			}
		]).then(function(answer) {
			switch(answer.option) {
				case 'Change Username':
					profile.changeUsername();
				break;
				case 'Change Password':
					profile.changePassword();
				break;
				case 'Back':
					storefront.landingPage();
				break;
			}
		});
	},
	//	Prompts for and validates the new username
	changeUsername: function() {
		inquirer.prompt([
			{
				name: 'username',
				message: 'Enter your new username',
				validate: function(username) {
					if(/^[A-Za-z0-9_]*$/.test(username) && username.length > 5 && username.length < 50) {
						return true;
					} else {
						return false;
					}
				}
			}
		//	Queries DB to ensure the new username does not already exist
		]).then(function(answer) {
			var sql = 'SELECT * FROM users WHERE ?';
			var query = db.query(
				sql,
				{
					user_name: answer.username.toLowerCase()
				},
				function(err, res) {
					if(err) throw err;
					//	If the username does not already exist, update the DB with the new username and redirect to the Edit Profile menu
					if(res === undefined || res.length == 0) {
						var sql = 'UPDATE users SET ? WHERE ?';
						var query = db.query(
							sql,
							[
								{
									user_name: answer.username.toLowerCase()
								},
								{
									user_name: user.username.toLowerCase()
								}
							],
							function(err, res) {
								if(err) throw err;
								user.username = answer.username.toLowerCase();
								console.log('\nUsername changed to: ' + user.username + '\n');
								profile.editProfile();
							}
						);
					//	Displays different messages if username already exists before redirecting back to the Edit Profile menu
					} else if(answer.username == user.username) {
						console.log('\nCannot change username to your current username\n');
						profile.editProfile();
					} else {
						console.log('\n' + answer.username + ' already exists.\n');
						profile.editProfile();
					}
				}
			)
		});
	},
	//	Prompts user for their current password
	//	The change password feature isn't really necessary, seeing as how the user must be logged in already in order to change it and there is no system-related reason
	//	for the user to change their password, but I still wanted to have the option because it could prove useful under other circumstances or potential future development
	changePassword: function() {
		inquirer.prompt([
			{
				name: 'current_password',
				message: 'Enter your current password',
				type: 'password',
				mask: '*'
			}
		//	Queries DB for user info (It just now occurs to me that I probably don't need this step b/c I am already storing the user info/password in the script's user info object
		//	Oh well...
		]).then(function(answer) {
			var sql = 'SELECT * FROM users WHERE ?';
			var query = db.query(
				sql,
				{
					id: user.id
				},
				function(err, res) {
					if(err) throw err;
					//	Compares the plain text password entered to the stored hashed password and either redirects back if they do not match, or prompts for the new password if they do
					bcrypt.compare(answer.current_password, user.password, function(err, res) {
						if(err) throw err;
						if(res) {
							inquirer.prompt([
								{
									name: 'new_password',
									message: 'Enter a new password',
									type: 'password',
									mask: '*',
									validate: function(password) {
										if(password.trim() == '' || !/(?=.*[0-9A-Z])/.test(password) || !/(?=^\S*$)/.test(password) || !/(^.{5,20}$)/.test(password)) {
											return false;
										} else {
											return true;
										}
									}
								},
								{
									name: 'confirm_password',
									message: 'Confirm new password',
									type: 'password',
									mask: '*'
								}
							]).then(function(answer) {
								
								if(answer.new_password != answer.confirm_password) {
									console.log('\nPasswords do not match\n');
									profile.editProfile();
								} else {
									//	Hashes the new password and updates the user's password in the DB before redirecting back to the Edit Profile menu
									bcrypt.hash(answer.new_password, saltRounds, function(error, hash) {
										var sql = 'UPDATE users SET ? WHERE ?';
										var query = db.query(
											sql,
											[
												{
													user_password: hash
												},
												{
													id: user.id
												}
											],
											function(err, res) {
												if(err) throw err;
												user.password = hash;
												console.log('\nPassword updated!\n');
												profile.editProfile();
											}
										);
									});
								}
							});
						} else {
							console.log('\nPassword does not match\n');
							profile.editProfile();
						}
					});
				}
			);
		});
	}
}

//	Object holding all of the storefront properties and methods
var storefront = {
	//	Shopping Cart holds all of the product objects the user adds
	shoppingCart: [],
	//	Holds the current purchase order number when a purchase is made
	purchaseOrder: '',
	//	Establishes list of the Main Menu/Landing Page options for the user
	landingPage: function() {
		console.log('\n----- DUNDER-MIFFLIN STOREFRONT -----\n');
		var options = [
			'Search By Product ID',
			'Search By Product Name',
			'Browse By Department', 
			'View Shopping Cart (' + storefront.shoppingCart.length + ')',
			'Checkout (' + storefront.shoppingCart.length + ')'
		];
		//	Adds additional options based on if the user is logged in or not
		if(user.login) {
			options.push('Edit Profile', 'View Purchase History', 'Logout');
		} else {
			options.push('Create Account', 'Login');
		}
		options.push('Exit');
		//	Prompts the user, displaying the above list options for them to choose from
		inquirer.prompt([
			{
				message: 'What would you like to do?\n',
				type: 'list',
				choices: options,
				name: 'selection'
			}
		]).then(function(answer) {
			switch(answer.selection) {
				case 'Search By Product ID':
					storefront.searchById();
				break;
				case 'Search By Product Name':
					storefront.searchByProduct();
				break;
				case 'Browse By Department':
					storefront.browseDepartments();
				break;
				case 'View Shopping Cart (' + storefront.shoppingCart.length + ')':
					storefront.viewShoppingCart();
				break;
				case 'Checkout (' + storefront.shoppingCart.length + ')':
					storefront.checkout();
				break;
				case 'Edit Profile':
					profile.editProfile();
				break;
				case 'View Purchase History':
					user.viewPurchaseHistory();
				break;
				case 'Create Account':
					createAccount.promptUsername();
				break;
				case 'Exit':
					if(user.login) {
						console.log('\nGoodbye, ' + user.username + '!\n');
					} else {
						console.log('\Goodbye!\n');
					}
					db.end();
				break;
				case 'Login':
					login.promptUsername();
				break;
				case 'Logout':
					login.logout();
				break;
			}
		});
	},
	//	Prompts the user for a quantity amount of the product they have chosen
	promptQuantity: function(product, checkout) {
		inquirer.prompt([
			{
				name: 'quantity',
				message: 'Enter quantity: ' + product.product_name + ' ($' + product.price + ')',
				validate: function(value) {
					if(/^[0-9]+$/g.test(value)) {
						return true;
					} else {
						return false;
					}
				}
			}
		]).then(function(answer) {
			//	Checks if there is sufficent stock of the selected product
			if(parseInt(answer.quantity) > product.stock_quantity) {
				console.log('\nThere is insufficient stock for that amount');
				console.log('(Total stock for ' + product.product_name + ' is ' + product.stock_quantity + ')\n');
				storefront.promptQuantity(product)
			} else {
				var cartItem = product;
				cartItem.purchase_quantity = parseInt(answer.quantity);
				//	Checks if the product already exists in the shopping cart
				if(storefront.shoppingCart.indexOf(product) < 0) {
					//	Adds the product to the shopping cart only if the quantity being purchased is greater than 0
					if(cartItem.purchase_quantity > 0) {
						storefront.shoppingCart.push(cartItem);
						console.log('\n' + product.product_name + ' (' + answer.quantity + ') has been added to your shopping cart!\n');
					}
				//	If product already exists within the shopping cart, either updates the quantity if the purchase quantity is greater than 0
				//	or removes the item from the cart if the purchase quantity is 0 (will never be less than 0 because of the prompt validations above)
				} else {
					if(cartItem.purchase_quantity > 0) {
						storefront.shoppingCart[storefront.shoppingCart.indexOf(product)] = cartItem;
						console.log('\n' + cartItem.product_name + '(' + answer.quantity + ') has been updated\n');
					} else {
						storefront.shoppingCart.splice(storefront.shoppingCart.indexOf(product), 1);
					}
				}
				//	Redirects back to the Storefront Landing Page
				if(checkout) {
					storefront.checkout();
				} else {
					storefront.landingPage();
				}
			}
		});
	},
	searchById: function() {
		console.log('\n----- SEARCH BY ID NUMBER -----\n');
		//	Prompts user for a product ID number
		inquirer.prompt([
			{
				name: 'id',
				message: 'Enter the product ID number'
			}
		//	Queries the DB by the product id number
		]).then(function(item) {
			var sql = 'SELECT * FROM products WHERE ?';
			var query = db.query(
				sql,
				{
					id: item.id
				},
				function(err, res) {
					if(err) throw err;
					//	Logs message and redirects back to the Storefront Landing Page if product id is not found
					if(res === undefined || res.length == 0) {
						console.log('\nProduct not found\n');
						storefront.landingPage();
					//	Logs message and redirects back to the Storefront Landing Page if product is out of stock
					} else if(res.stock_quantity < 0) {
						console.log('\nSorry, that product is out of stock\n');
						storefront.landingPage();
					//	Prompts user for their desired quantity if the product is found and in stock 
					} else {
						storefront.promptQuantity(res[0]);
					}
				}
			);
		});
	},
	searchByProduct: function() {
		console.log('\n----- SEARCH BY PRODUCT NAME -----\n');
		//	Prompts user for product name to search by
		inquirer.prompt([
			{
				name: 'name',
				message: 'Enter the product name'
			}
		//	Queries DB searching for product names containing the prompted search string (uses the mysql package connection.escape method to escape the string)
		]).then(function(item) {
			var sql = 'SELECT * FROM products WHERE LOWER(product_name) LIKE ' + db.escape('%' + item.name.toLowerCase() + '%');
			var query = db.query(
				sql,	
				function(err, res) {
					if(err) throw err;
					//	If no search results found, prompts user to see if they would like to conduct another search or not
					if(res === undefined || res.length == 0) {
						console.log('\nNo matches found\n');
						inquirer.prompt([
							{
								name: 'confirm',
								type: 'confirm',
								message: 'Would you like to search again?'
							}
						]).then(function(answer) {
							if(answer.confirm) {
								storefront.searchByProduct();
							} else {
								storefront.landingPage();
							}
						});
					//	If search results are found, loops through the results to display all of the product names in a list for the user to choose from
					} else {
						var options = [];
						res.forEach(function(item) {
							options.push(item.product_name + ' ($' + item.price + ')');
						});
						//	Adds an option for the user to go back to the Storefront Landing Page
						options.push('Back');
						inquirer.prompt([
							{
								name: 'product',
								message: 'Select a product to add to your Shopping Cart',
								type: 'list',
								choices: options
							}
						//	Checks whether the selected product is in stock or not, if it is available, prompts the user for their desired quantity
						]).then(function(answer) {
							if(answer.product == 'Back') {
								storefront.landingPage();
							} else {
								var index = options.indexOf(answer.product);
								var product = res[index];
								if(product.stock_quantity < 1) {
									console.log('\nSorry, that product is out of stock\n');
									storefront.landingPage();
								} else {
									storefront.promptQuantity(product);
								}
							}
						});
					}
				}
			);
		});
	},
	browseDepartments: function() {
		console.log('\n----- BROWSE DEPARTMENTS -----\n');
		//	Queries DB for all of the departments and loops through the results to display the department names in a list for the user
		var sql = 'SELECT * FROM departments';
		var query = db.query(
			sql,
			function(err, res) {
				if(err) throw err;
				var departments = [];
				res.forEach(function(department) {
					departments.push(department.department_name);
				});
				departments.push('Back');
				inquirer.prompt([
					{
						name: 'department',
						message: 'Which department Would you like to view?',
						type: 'list',
						choices: departments
					}
				//	If the user does not go back to the storefront, queries the DB for all of the products in the selected department,
				//	and loops through the results to display the product names in a list for the user
				]).then(function(answer) {
					if(answer.department == 'Back') {
						storefront.landingPage();
					} else {
						var sql = "SELECT * FROM products WHERE department_name='" + answer.department + "'";
						var query = db.query(
							sql,
							function(err, res) {
								if(err) throw err;
								var products = [];
								res.forEach(function(item) {
									products.push(item.product_name + ' ($' + item.price + ')');
								});
								products.push('Back');
								inquirer.prompt([
									{
										name: 'product',
										message: 'Select a product to add to your Shopping Cart',
										type: 'list',
										choices: products 
									}
								//	If the user does not go back to the Departments,
								//	checks whether or not the selected product is in stock before prompting the user for their desired quantity
								]).then(function(answer) {
									if(answer.product == 'Back') {
										storefront.browseDepartments();
									} else {
										var index = products.indexOf(answer.product);
										var product = res[index];
										if(product.stock_quantity < 1) {
											console.log('\nSorry, that product is out of stock\n');
											storefront.browseDepartments();
										} else {
											storefront.promptQuantity(product);
										}
									}
								});
							}
						);
					}
				});
			}
		)
	},
	viewShoppingCart: function() {
		
		var options = [];
		
		//	Add product name and quantity to the list items of the Shopping Cart
		storefront.shoppingCart.forEach(function(item) {
			options.push(item.product_name + ' (' + item.purchase_quantity + ')');
		});
		//	Add a 'Back' option to the list items
		options.push('Back');
		console.log('\n----- SHOPPING CART -----\n');
		inquirer.prompt([
			{
				name: 'product',
				message: 'Choose a product to Edit/Remove from the shopping cart\n',
				type: 'list',
				choices: options
			}
		]).then(function(answer) {
			
			//	Go back if 'Back' is selected, otherwise edit the shopping cart
			if(answer.product == 'Back') {
				storefront.landingPage();
			} else {
				storefront.editShoppingCart(answer, false);
			}
		});
	},
	checkout: function() {
		console.log('\n----- CHECKOUT -----\n');
		//	Generate a list containing all the product names in the shopping cart for the user to review
		var options = [];
		storefront.shoppingCart.forEach(function(item) {
			options.push(item.product_name + ' (' + item.purchase_quantity + ')');
		});
		//	Add options for going back to the storefront Landing Page and finalizing the order
		options.push('Back', 'Place Order');
		inquirer.prompt([
			{
				name: 'product',
				message: 'Review your cart before finalizing your purchase',
				type: 'list',
				choices: options
			}
		//	Handle the user's choice
		]).then(function(answer) {
			switch(answer.product) {
				case 'Back':
					storefront.landingPage();
				break;
				case 'Place Order':
					if(storefront.shoppingCart.length > 0) {
						storefront.generatePurchaseOrder().then(function() {
							storefront.placeOrder();
						});
					} else {
						console.log('\nThere are no items in your shopping cart\n');
						storefront.landingPage();
					}
				break;
				default:
					storefront.editShoppingCart(answer, true);
				break;
			}
		});
	},
	editShoppingCart: function(answer, checkout) {
		var product;
		//	Display each product name and quantity
		storefront.shoppingCart.forEach(function(item) {
			if(item.product_name + ' (' + item.purchase_quantity + ')' == answer.product) {
				product = item;
			}
		});
		var index = storefront.shoppingCart.indexOf(product);
		//	Prompts the user to Edit Quantity, Remove the Product from Cart, or Go Back
		inquirer.prompt([
			{
				name: 'option',
				message: 'Choose an option',
				type: 'list',
				choices: [
					'Edit Quantity (' + product.purchase_quantity + ')',
					'Remove Product (' + product.product_name + ') from Shopping Cart',
					'Back'
				]
			}
		]).then(function(answer) {
			switch(answer.option) {
				//	Goes back to the appropriate menu depending on where the user was previously
				case 'Back':
					if(checkout) {
						storefront.checkout();
					} else {
						storefront.viewShoppingCart();
					}
				break;
				//	Allows the user to edit the quantity
				case 'Edit Quantity (' + product.purchase_quantity + ')':
					storefront.promptQuantity(product, checkout);
				break;
				//	Removes the product from the Shopping Cart
				case 'Remove Product (' + product.product_name + ') from Shopping Cart':
					storefront.shoppingCart.splice(storefront.shoppingCart.indexOf(product), 1);
					if(storefront.shoppingCart.length > 0) {
						storefront.viewShoppingCart();
					//	Redirects to either the checkout menu or main landing page if the shopping cart is empty after removing a product
					} else if(checkout) {
						storefront.checkout();
					} else {
						storefront.landingPage();
					}
				break;
			}
		});
	},
	//	The purchase order is random giberish, but it does give the ability to look up entire purchases rather than individual product sales
	generatePurchaseOrder: function() {
		//	Uses a Promise because the DB Query is asynchronous 
		return new Promise(function(resolve, reject) {
			var number = '';
			var alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
			//	Generates 3 sets of 3 alphanumeric characters, each separated by a dash
			for(var i = 0; i < 3; i++) {
				for(var j = 0; j < 3; j++) {
					//	50% chance of each individual digit being a letter or number
					var random = Math.floor(Math.random() * 2);
					if(random == 0) {
						number += Math.floor(Math.random() * 10);
					} else {
						number += alphabet[Math.floor(Math.random() * alphabet.length)];
					}
				}
				if(i != 2) {
					number += '-';
				}
			}
			//	Adds another dash and random letter to the end of the string
			number += '-';
			number += alphabet[Math.floor(Math.random() * alphabet.length)];
			//	Queries the DB to ensure uniquness of the random generated string (just in case...); Uses recursion if the string is not unique
			var sql = 'SELECT * FROM purchases WHERE ?';
			var query = db.query(
				sql,
				{
					purchase_order: number
				},
				function(err, res) {
					if(err) throw err;
					if(res === undefined || res.length == 0) {
						storefront.purchaseOrder = number;
						resolve('End of Promise');
					} else {
						storefront.generatePurchaseOrder();
					}
				}
			)
		});
	},
	//	This is used as a counter for dealing with the asynchronous nature of the placeOrder method that follows
	orderCounter: 0,
	//	This method "loops" through the Shopping Cart using a counter property and recursion since the functions within are asynchronous
	placeOrder: function() {
		var sql = 'Update products SET ? WHERE ?';
		var sql2 = 'INSERT INTO purchases SET ?';
		if(storefront.orderCounter < storefront.shoppingCart.length) {
			var currentItem = storefront.shoppingCart[storefront.orderCounter];
			//	Updates the DB stock quantity for each product being purchased
			var query = db.query(
				sql,
				[
					{
						stock_quantity: currentItem.stock_quantity - currentItem.purchase_quantity,
						product_sales: currentItem.product_sales + (currentItem.price * currentItem.purchase_quantity)
					},
					{
						id: storefront.shoppingCart[storefront.orderCounter].id
					}
				],
				function(err, res) {
					if(err) throw err;
					var month = 60 * 60 * 24 * 30;
					var timestamp = moment().format('X');
					var uid;
					if(user.id) {
						uid = user.id
					} else {
						uid = 0;
					}
					//	Adds all of the purchase information into the DB 
					var query2 = db.query(
						sql2,
						{
							timestamp: timestamp,
							user_id: uid,
							purchase_order: storefront.purchaseOrder,
							product_id: storefront.shoppingCart[storefront.orderCounter].id,
							product_name: storefront.shoppingCart[storefront.orderCounter].product_name,
							department_id: storefront.shoppingCart[storefront.orderCounter].department_id,
							price: storefront.shoppingCart[storefront.orderCounter].price,
							quantity: storefront.shoppingCart[storefront.orderCounter].purchase_quantity,
							revenue: storefront.shoppingCart[storefront.orderCounter].price * storefront.shoppingCart[storefront.orderCounter].purchase_quantity
						},
						function(err, res) {
							if(err) throw err;
							storefront.orderCounter++;
							storefront.placeOrder();
						}
					);
				}
			);
		//	After cycling through all of the Shopping Cart items, resets the counter back to 0 and logs messages back to the user before prompting them to either
		//	continue shopping or exit the application
		} else {
			storefront.orderCounter = 0;
			console.log('\n----- ORDER PLACED -----\n');
			var plural = '';
			if(storefront.shoppingCart.length > 1) {
				plural = 's';
			}
			var money = 0;
			storefront.shoppingCart.forEach(function(item) {
				money += (item.purchase_quantity * item.price);
			});
			console.log('You purchased ' + storefront.shoppingCart.length + ' product' + plural + ' for $' + money.toFixed(2));
			console.log('Your order number is: ', storefront.purchaseOrder, '\n');
			storefront.shoppingCart = [];
			inquirer.prompt([
				{
					name: 'choice',
					message: 'What would you like to do now?',
					type: 'list',
					choices: ['Continue Shopping', 'Exit']
				}
			]).then(function(answer) {
				switch(answer.choice) {
					case 'Continue Shopping':
						storefront.landingPage();
					break;
					case 'Exit':
						if(user.login) {
							console.log('\nGoodbye, ' + user.username + '!\n');
						} else {
							console.log('\Goodbye!\n');
						}
						db.end();
					break;
				}
			});
		}
	}
}

var admin = {
	managerView: function() {
		console.log('\n----- MANAGER VIEW -----\n');
		var choices = ['Manage Products', 'Manage Inventory', 'View Purchases'];
		if(user.permissions == 2) {
			choices.push('View Reports', 'Manage Users');
		}
		choices.push('Logout', 'Exit');
		inquirer.prompt([
			{
				name: 'option',
				message: 'Manager View',
				type: 'list',
				choices: choices
			}
		]).then(function(answer) {
			switch(answer.option) {
				case 'Manage Products':
					admin.manageProducts();
				break;
				case 'Manage Inventory':
					admin.manageInventory();
				break;
				case 'View Purchases':
					admin.viewPurchases();
				break;
				case 'View Reports':
					reports.view();
				break;
				case 'Manage Users':
					admin.manageUsers();
				break;
				case 'Logout':
					login.logout();
				break;
				case 'Exit':
					console.log('\nGoodbye, ' + user.username + '\n');
					db.end();
				break;
			}
		});
	},
	manageProducts: function() {
		console.log('\n----- MANAGE PRODUCTS -----\n');
		inquirer.prompt([
			{
				name: 'option',
				message: 'Manage Products',
				type: 'list',
				choices: ['View Products By Department', 'View All Products', 'Add New Product', 'Remove Product', 'Back']
			}
		]).then(function(answer) {
			switch(answer.option) {
				case 'View Products By Department':
					admin.viewDepartments();
				break;
				case 'View All Products':
					admin.viewAllProducts();
				break;
				case 'Add New Product':
					admin.addProduct();
				break;
				case 'Remove Product':
					admin.removeProduct();
				break;
				case 'Back':
					admin.managerView();
				break;
			}
		});
	},
	viewDepartments: function() {
		console.log('\n----- DEPARTMENTS -----\n');
		//	Queries DB for all of the departments and loops through the results to display the department names in a list for the user
		var sql = 'SELECT * FROM departments';
		var query = db.query(
			sql,
			function(err, res) {
				if(err) throw err;
				var departments = [];
				res.forEach(function(department) {
					departments.push(department.department_name);
				});
				departments.push('Back');
				inquirer.prompt([
					{
						name: 'department',
						message: 'Which department would you like to view?',
						type: 'list',
						choices: departments
					}
				//	If the user does not go back to the previous menu, queries the DB for all of the products in the selected department,
				//	and loops through the results to display the product names in a list for the user
				]).then(function(answer) {
					if(answer.department == 'Back') {
						admin.managerView();
					} else {
						var sql = "SELECT * FROM products WHERE department_name='" + answer.department + "'";
						var query = db.query(
							sql,
							function(err, res) {
								if(err) throw err;
								admin.productsTable(res);
							}
						);
					}
				});
			}
		)
	},
	viewAllProducts: function() {
		console.log('\n----- ALL PRODUCTS -----\n');
		var sql = 'SELECT * FROM products';
		var query = db.query(
			sql,
			function(err, res) {
				if(err) throw err;
				admin.productsTable(res);
			}
		)
	},
	addProduct: function() {
		console.log('\n----- ADD PRODUCT -----\n');
		var sql = 'SELECT * FROM departments';
		var query = db.query(
			sql,
			function(err, res) {
				if(err) throw err;
				var departments = [];
				res.forEach(function(dep) {
					departments.push(dep.department_name);
				});
/*
				if(user.permissions > 1) {
					departments.push('(Add New Department)');
				}
*/
				inquirer.prompt([
					{
						name: 'product',
						message: 'What is the name of the product?',
						validate: function(product) {
							if(/^[A-Za-z0-9_&\., -]+$/.test(product.trim())) {
								return true;
							} else {
								return false;
							}
						},
					},
					{
						name: 'department',
						message: 'Select the department of the product',
						type: 'list',
						choices: departments
					}
				]).then(function(answers) {
					if(answers.department == '(Add New Department)') {
						admin.addDepartment();
					} else {
						inquirer.prompt([
							{
								name: 'price',
								message: 'What is the price of the product?',
								validate: function(price) {
									if(isNaN(price) || price < 0) {
										return false;
									} else {
										return true;
									}
								}
							},
							{
								name: 'quantity',
								message: 'What is the initial stock quantity of the product?',
								validate: function(quantity) {
									if(isNaN(quantity) || quantity < 0) {
										return false;
									} else {
										return true;
									}
								}
							}
						]).then(function(nums) {
							var depID;
							res.forEach(function(dep) {
								if(dep.department_name == answers.department) {
									depID = dep.id
								}
							});							
							var sql = 'INSERT INTO products SET ?';
							var query = db.query(
								sql,
								{
									product_name: answers.product,
									department_id: depID,
									department_name: answers.department,
									price: nums.price,
									stock_quantity: nums.quantity
								},
								function(err, res) {
									if(err) throw err;
									console.log('\nNew product added: ' + answers.product + '\n');
									inquirer.prompt([
										{
											name: 'confirm',
											message: 'Add another product?',
											type: 'confirm'
										}
									]).then(function(answer) {
										if(answer.confirm) {
											admin.addProduct();
										} else {
											admin.manageProducts();
										}
									});
								}
							);
						});
					}
				});
			}	
		);
	},
	removeProduct: function() {
		console.log('----- REMOVE PRODUCT -----');
		var sql = 'SELECT * FROM products';
		var query = db.query(
			sql,
			function(err, res) {
				if(err) throw err;
				var products = [];
				res.forEach(function(product) {
					products.push(product.product_name);
				});
				products.push('Back');
				inquirer.prompt([
					{
						name: 'product',
						message: 'Select a product to be removed',
						type: 'list',
						choices: products
					}
				]).then(function(answer) {
					if(answer.product == 'Back') {
						admin.manageProducts();
					} else {
						var selectedProduct;
						res.forEach(function(product) {
							if(product.product_name == answer.product) {
								selectedProduct = product;
							}
						});
						inquirer.prompt([
							{
								name: 'confirm',
								message: 'Are you sure you would like to remove ' + selectedProduct.product_name + '?',
								type: 'confirm'
							}
						]).then(function(answer) {
							if(answer.confirm) {
								var sql = 'DELETE FROM products WHERE ? LIMIT 1';
								var query = db.query(
									sql,
									{
										id: selectedProduct.id
									},
									function(err, res) {
										if(err) throw err;
										console.log('\nProduct removed: ' + selectedProduct.product_name + '\n');
										admin.manageProducts();
									}
								);
							} else {
								admin.manageProducts();
							}
						});
					}
				});
			}
		);
	},
	manageInventory: function() {
		console.log('\n----- MANAGE INVENTORY -----\n');
		inquirer.prompt([
			{
				name: 'option',
				message: '-----',
				type: 'list',
				choices: ['View Low Inventory', 'View Inventory By Department', 'View All Inventory', 'Add Inventory', 'Back']
			}
		]).then(function(answer) {
			switch(answer.option) {
				case('View Low Inventory'):
					return admin.viewLowInventory();
				case('View Inventory By Department'):
					return admin.viewDepartments();
				case('View All Inventory'):
					return admin.viewAllProducts();
				case('Add Inventory'):
					return admin.viewAllInventory();
				case('Back'):
					return admin.managerView();
			}
		});
	},
	viewLowInventory: function() {
		console.log('\n----- LOW INVENTORY -----\n');
		var sql = 'SELECT * FROM products';
		var query = db.query(
			sql,
			function(err, res) {
				if(err) throw err;
				var lowInventory = [];
				res.forEach(function(product) {
					switch(product.department_id) {
						case(1):
							if(product.stock_quantity < 100) {
								lowInventory.push(product.product_name + ' (' + product.stock_quantity + ')');
							}
						break;
						case(2):
							if(product.stock_quantity < 500) {
								lowInventory.push(product.product_name + ' (' + product.stock_quantity + ')');
							}
						break;
						case(3):
							if(product.stock_quantity < 50) {
								lowInventory.push(product.product_name + ' (' + product.stock_quantity + ')');
							}
						break;
						case(4):
							if(product.stock_quantity < 25) {
								lowInventory.push(product.product_name + ' (' + product.stock_quantity + ')');
							}
						break;
						default:
							if(product.stock_quantity < 250) {
								lowInventory.push(product.product_name + ' (' + product.stock_quantity + ')');
							}
						break;
					}
				});
				lowInventory.push('Back');
				inquirer.prompt([
					{
						name: 'product',
						message: 'Select a product to add stock',
						type: 'list',
						choices: lowInventory
					}
				]).then(function(answer) {
					if(answer.product == 'Back') {
						admin.manageInventory();
					} else {
						var selectedProduct;
						res.forEach(function(product) {
							if(answer.product == product.product_name + ' (' + product.stock_quantity + ')') {
								selectedProduct = product;
							}
						});
						
						admin.addStock(selectedProduct);
					}
				});
			}
		)	
	},
	viewAllInventory: function() {
		console.log('\n----- INVENTORY -----\n');
		var sql = 'SELECT * FROM products';
		var query = db.query(
			sql,
			function(err, res) {
				if(err) throw err;
				var inventory = [];
				res.forEach(function(product) {
					inventory.push(product.product_name + ' (' + product.stock_quantity + ')');
				});
				inventory.push('Back');
				inquirer.prompt([
					{
						name: 'product',
						message: 'Select a product to add stock',
						type: 'list',
						choices: inventory
					}
				]).then(function(answer) {
					if(answer.product == 'Back') {
						admin.manageInventory();
					} else {
						var selectedProduct;
						res.forEach(function(product) {
							if(answer.product == product.product_name + ' (' + product.stock_quantity + ')') {
								selectedProduct = product;
							}
						});
						admin.addStock(selectedProduct);
					}
				});
			}
		)	
	},
	viewPurchases: function() {
		console.log('\n----- PURCHASES -----\n');
		inquirer.prompt([
			{
				name: 'option',
				message: 'Purchases',
				type: 'list',
				choices: ['View Purchases By Month', 'View All Purchases', 'Back']
			}
		]).then(function(answer) {
			switch(answer.option) {
				case 'View Purchases By Month':
					admin.viewPurchasesByMonth();
				break;
				case 'View All Purchases':
					admin.viewAllPurchases();
				break;
				case 'Back':
					admin.managerView();
				break;
			}
		});
	},
	viewAllPurchases: function() {
		console.log('\n----- VIEW ALL PURCHASES -----\n');
		var sql = 'SELECT * FROM purchases';
		var query = db.query(
			sql,
			function(err, res) {
				if(err) throw err;
				var table = new Table({horizontalLine: true, leftPadding: 2, rightPadding: 2});
				table.push(['Date', 'Purchase Order', 'Product ID', 'Product', 'Price', 'Quantity', 'Revenue']);
				res.forEach(function(purchase) {
					var date = moment(purchase.timestamp, 'X').format('MM-DD-YYYY');
					table.push([date, purchase.purchase_order, purchase.product_id, purchase.product_name, purchase.price, purchase.quantity, purchase.revenue.toFixed(2)]);
				});
				console.log('' + table);
				inquirer.prompt([
					{
						name: 'back',
						message: '-----',
						type: 'list',
						choices: ['Back']
					}
				]).then(function(answer) {
					admin.managerView();
				});
			}
		);
	},
	viewPurchasesByMonth: function() {
		console.log('\n----- VIEW PURCHASES BY MONTH -----\n');
		var sql = 'SELECT * FROM purchases';
		var query = db.query(
			sql,
			function(err, res) {
				if(err) throw err;
				//var table = new Table({horizontalLine: true, leftPadding: 2, rightPadding: 2});
				var months = [];
				//table.push(['Date', 'Purchase Order', 'Product ID', 'Product', 'Price', 'Quantity', 'Invoice Total']);
				res.forEach(function(purchase) {
					var date = moment(purchase.timestamp, 'X').format('MM-DD-YYYY');
					var dateFormatted = moment(purchase.timestamp, 'X').format('MM-YYYY');
					if(months.indexOf(dateFormatted) < 0) {
						months.push(dateFormatted);
					}
					//table.push(date, purchase.purchase_order, purchase.product_id, purchase.product_name, purchase.price, purchase.quantity, purchase.revenue);
				});
				inquirer.prompt([
					{
						name: 'month',
						message: 'Choose a month',
						type: 'list',
						choices: months.sort()
					}
				]).then(function(answer) {
					var table = new Table({horizontalLine: true, leftPadding: 2, rightPadding: 2});
					table.push(['Date', 'Purchase Order', 'Product ID', 'Product', 'Price', 'Quantity', 'Revenue']);
					res.forEach(function(purchase) {
						var date = moment(purchase.timestamp, 'X').format('MM-DD-YYYY');
						var dateFormatted = moment(purchase.timestamp, 'X').format('MM-YYYY');
						if(dateFormatted == answer.month) {
							table.push([date, purchase.purchase_order, purchase.product_id, purchase.product_name, purchase.price, purchase.quantity, purchase.revenue.toFixed(2)]);
						}
					});
					var dateString = moment(answer.month, 'MM-YYYY').format('MMMM-YYYY');
					console.log('\n----- ' + dateString + ' -----');
					console.log('' + table);
					inquirer.prompt([
						{
							name: 'back',
							message: '-----',
							type: 'list',
							choices: ['Back']
						}
					]).then(function(answer) {
						admin.managerView();
					});
				});
			}
		)
	},
	productsTable: function(res) {
		var table = new Table({horizontalLine: true, leftPadding: 2, rightPadding: 2});
		table.push(['ID', 'Product', 'Department', 'Price', 'Quantity', 'Total Sales']);
		res.forEach(function(product) {
			var sales;
			product.product_sales == null ? sales = 0 : sales = product.product_sales;
			table.push([product.id, product.product_name, product.department_name, product.price, product.stock_quantity, sales]);
		});
		console.log('' + table);
		var menus = ['Go to Products Menu', 'Go to Inventory Menu'];
		if(user.permissions > 0) {
			menus.push('Go to Manager Menu');
		}
/*
		 else if(user.permissions == 2) {
			menus.push('Go to Admin Menu');
		}
*/
		inquirer.prompt([
			{
				name: 'back',
				message: '-----',
				type: 'list',
				choices: menus
			}
		]).then(function(answer) {
			switch(answer.back) {
				case 'Go to Products Menu':
					return admin.manageProducts();
				case 'Go to Inventory Menu':
					return admin.manageInventory();
				case 'Go to Manager Menu':
					return admin.managerView();
				case 'Go to Admin Menu':
					return console.log('Oops... forgot to add this function!');
			}
		});
	},
	addStock: function(product) {
		inquirer.prompt([
			{
				name: 'quantity',
				message: 'How much stock would you like to add?',
				validate: function(val) {
					if(!/^\d+$/.test(val) || val < 0) {
						return false;
					} else {
						return true;
					}
				}
			}
		]).then(function(answer) {
			if(answer.quantity < 1) {
				console.log('\nBack to Inventory Menu\n');
				admin.manageInventory();
			} else {
				var sql = 'UPDATE products SET ? WHERE ?';
				var query = db.query(
					sql,
					[
						{
							stock_quantity: parseInt(product.stock_quantity) + parseInt(answer.quantity)
						},
						{
							id: product.id
						}
					],
					function(err, res) {
						if(err) throw err;
						console.log('\n' + answer.quantity + ' stock added to ' + product.product_name);
						console.log(product.product_name + ': ', parseInt(product.stock_quantity) + parseInt(answer.quantity), '\n');
						admin.manageInventory();
					}
				);
			}
		});
	},
	escapeString: function(string) {
		var entities = {
			'&': '\&',
			'<': '\<',
			'>': '\>',
			'"': '\"',
			"'": "\'",
			'/': '\/',
			'`': '\`',
			'=': '\='
		};
	  return String(string).replace(/[&<>"'`=\/]/g, function (entity) {
	    return entities[entity];
	  });
	},
	manageUsers: function() {
		var sql = 'SELECT * FROM users';
		var query = db.query(
			sql,
			function(err, res) {
				if(err) throw err;
				var users = [];
				res.forEach(function(user) {
					var userType = '';
// 					console.log(user);
					switch(user.permissions) {
						case 0:
							userType = 'Customer';
						break;
						case  1:
							userType = 'Manager';
						break;
						case 2:
							userType = 'System Admin';
						break;
					}
					if(user.id != 0. && user.permissions != -1) {
// 						console.log(user.user_name, user.id);
						users.push(user.user_name + ' (' + userType + ')');
					}
				});
				users.push('Add New User', 'Manage Inactive Users', 'Back');
				inquirer.prompt([
					{
						name: 'user',
						message: 'Select a user to Edit',
						type: 'list',
						choices: users
					}
				]).then(function(answer) {
					switch(answer.user) {
						case 'Back':
							admin.managerView();
						break;
						case 'Manage Inactive Users':
							admin.manageInactiveUsers();
						break;
						case 'Add New User':
							createAccount.promptUsername(true);
						break;
						default:
// 							console.log('Default: ' + answer.user);
							var arr = answer.user.split(' ');
							var selectedUser;
							res.forEach(function(user) {
								if(user.user_name == arr[0]) {
									selectedUser = user;
								}
							});
// 							console.log(selectedUser);
							inquirer.prompt([
								{
									name: 'option',
									message: 'Select action for User: ' + selectedUser.user_name,
									type: 'list',
									choices: ['Edit Username', 'Reset User Password', 'Change Permissions', 'Deactivate User', 'Back']
								}
							]).then(function(answer) {
								switch(answer.option) {
									case 'Edit Username':
										admin.editUser(selectedUser);
									break;
									case 'Reset User Password':
										admin.resetPassword(selectedUser);
									break;
									case 'Change Permissions':
										admin.changeUserPermissions(selectedUser);
									break;
									case 'Deactivate User':
										admin.deactivateUser(selectedUser);
									break;
									case 'Back':
										admin.manageUsers();
									break;
								}
							});
						break;
					}
				});
			}	
		);
	},
	manageInactiveUsers: function() {
		console.log('----- INACTIVE USERS -----');
		var sql = 'SELECT * FROM users WHERE ?';
		var query = db.query(
			sql,
			{
				permissions: -1
			},
			function(err, res) {
				if(err) throw err;
				var users = [];
				res.forEach(function(user) {
					users.push(user.user_name);
				});
				users.push('Back');
				inquirer.prompt([
					{
						name: 'user',
						message: 'Select user to change permissions',
						type: 'list',
						choices: users
					}
				]).then(function(answer) {
					if(answer.user == 'Back') {
						admin.manageUsers();
					} else {
						var selectedUser;
						res.forEach(function(user) {
							if(user.user_name == answer.user) {
								selectedUser = user;
							}
						});
						admin.changeUserPermissions(selectedUser);
					}
				});
			}
		);
	},
	changeUserPermissions: function(selectedUser) {
		console.log('\n----- CHANGE USER PERMISSIONS (' + selectedUser.user_name.toUpperCase() + ') -----\n');
		inquirer.prompt([
			{
				name: 'permission',
				message: 'Select Permission Access',
				type: 'list',
				choices: ['Customer', 'Manager', 'System Admin', 'Deactivate', 'Back']
			}
		]).then(function(answer) {
			var permission;
			switch(answer.permission) {
				case 'Customer':
					permission = 0;
				break;
				case 'Manager':
					permission = 1;
				break;
				case 'System Admin':
					permission = 2;
				break;
				case 'Deactivate':
					permission = -1;
				break;
				case 'Back':
					return admin.manageUsers();
				break;
			}
			if(permission == selectedUser.permissions) {
				console.log('\nUser permissions already set to ' + answer.permission + '\n');
				admin.manageUsers();
			} else {
				var sql = 'UPDATE users SET ? WHERE ?';
				var query = db.query(
					sql,
					[
						{
							permissions: permission
						},
						{
							id: selectedUser.id
						}
					],
					function(err, res) {
						console.log('\nUser permissions updated to ' + answer.permission + '\n');
						admin.manageUsers();
					}
				);
			}
		});
	},
	editUser: function(selectedUser) {
		console.log('\n----- EDIT USER -----\n');
		inquirer.prompt([
			{
				name: 'username',
				message: 'Type new username',
				validate: function(username) {
					if(/^[A-Za-z0-9_]*$/.test(username) && username.length > 5 && username.length < 50) {
						return true;
					} else {
						return false;
					}
				}
			}
		]).then(function(answer) {
			var sql = 'SELECT * FROM users WHERE ?';
			var query = db.query(
				sql,
				{
					user_name: answer.username.toLowerCase()
				},
				function(err, res) {
					if(err) throw err;
					if(res === undefined || res.length == 0) {
						var sql = 'UPDATE users SET ? WHERE ?';
						var query = db.query(
							sql,
							[
								{
									user_name: answer.username.toLowerCase()
								},
								{
									id: selectedUser.id
								}
							],
							function(err, res) {
								if(err) throw err;
								console.log('\nUsername updated: ' + answer.username.toLowerCase() + '\n');
								admin.manageUsers();
							}
						);
					} else {
						console.log('\n' + answer.username + ' already exists.\n');
						createAccount.promptUsername(admin);
					}
				}
			);
		});
	},
	resetPassword: function(selectedUser) {
		console.log('\n----- RESET PASSWORD -----\n');
		bcrypt.hash('Temp123', saltRounds, function(error, hash) {
			var sql = 'UPDATE users SET ? WHERE ?';
			var query = db.query(
				sql,
				[
					{
						user_password: hash,
					},
					{
						id: selectedUser.id
					}
				],
				function(err, res) {
					if(err) throw err;
					console.log('\nUser (' + selectedUser.user_name + ') password reset to: Temp123\n');
					admin.manageUsers();
				}
			);
		});
	},
	deactivateUser: function(selectedUser) {
		console.log('\n----- DEACTIVATE USER (' + selectedUser.user_name.toUpperCase() + ') -----\n');
		inquirer.prompt([
			{
				name: 'confirm',
				message: 'Are you sure you want to deactivate user: ' + selectedUser.user_name + '?',
				type: 'confirm'
			}
		]).then(function(answer) {
			if(answer.confirm) {
				var sql = 'UPDATE users SET ? WHERE ?';
				var query = db.query(
					sql,
					[
						{
							permissions: -1
						},
						{
							id: selectedUser.id
						}
					],
					function(err, res) {
						if(err) throw err;
						console.log('\nDeactivated User: ' + selectedUser.user_name + '\n');
						admin.manageUsers();
					}
				);
			} else {
				admin.manageUsers();
			}
		});
	}
}

var reports = {
	view: function() {
		console.log('\n----- REPORTS -----\n');
		inquirer.prompt([
			{
				name: 'report',
				message: 'Select a report to view',
				type: 'list',
				choices: ['Income Statement (Month)', 'Income Statement (Year)', 'Back']
			}
		]).then(function(answer) {
			switch(answer.report) {
				case 'Income Statement (Year)':
					return reports.viewIncome('year');
				case 'Income Statement (Month)':
					return reports.viewIncome('month');
				case 'Reports by Department':
					return
				case 'Back':
					return admin.managerView();
			}
		});
	},
	viewIncome: function(timeframe) {
		console.log('\n----- INCOME BY ' + timeframe.toUpperCase() + ' -----\n');
/*
		var sql = 'SELECT purchases.timestamp, purchases.department_id, purchases.revenue, departments.over_head_costs ';
		sql += 'FROM purchases p INNER JOIN departments d ';
		sql += 'ON (p.department_id = d.id)';
*/
		var sql = 'SELECT purchases.timestamp, purchases.department_id, purchases.revenue, departments.over_head_costs FROM purchases INNER JOIN departments ON (purchases.department_id = departments.id)';
		var query = db.query(
			sql,
			function(err, res) {
				if(err) throw err;
				//var table = new Table({horizontalLine: true, leftPadding: 2, rightPadding: 2});
				var period = [];
				//table.push(['Date', 'Purchase Order', 'Product ID', 'Product', 'Price', 'Quantity', 'Invoice Total']);
				res.forEach(function(purchase) {
					var date = moment(purchase.timestamp, 'X').format('MM-DD-YYYY');
					var dateFormatted = '';
					if(timeframe == 'month') {
						dateFormatted = moment(purchase.timestamp, 'X').format('MM-YYYY');
					} else if(timeframe == 'year') {
						dateFormatted = moment(purchase.timestamp, 'X').format('YYYY');
					}
					if(period.indexOf(dateFormatted) < 0) {
						period.push(dateFormatted);
					}
					//table.push(date, purchase.purchase_order, purchase.product_id, purchase.product_name, purchase.price, purchase.quantity, purchase.revenue);
				});
				inquirer.prompt([
					{
						name: 'period',
						message: 'Choose a period',
						type: 'list',
						choices: period.sort()
					}
				]).then(function(answer) {
					var totalIncome = 0;
					var paperIncome = 0;
					var paperExpense = 0;
					var suppliesIncome = 0;
					var suppliesExpense = 0;
					var equipmentIncome = 0;
					var equipmentExpense = 0;
					var furnitureIncome = 0;
					var furnitureExpense = 0;
					var months = [];
					res.forEach(function(purchase) {
						var dateFormatted = '';
						var monthFormatted = '';
						if(timeframe == 'month') {
							dateFormatted = moment(purchase.timestamp, 'X').format('MM-YYYY');
							monthFormatted = dateFormatted;
						} else if(timeframe == 'year') {
							dateFormatted = moment(purchase.timestamp, 'X').format('YYYY');
							monthFormatted = moment(purchase.timestamp, 'X').format('MM-YYYY');
						}
						if(months.indexOf(monthFormatted) < 0) {
							months.push(monthFormatted);
						}
						if(dateFormatted == answer.period) {
							totalIncome += parseInt(purchase.revenue);
							if(purchase.department_id == 1) {
								paperIncome += parseFloat(purchase.revenue);
								paperExpense = purchase.over_head_costs;
							} else if(purchase.department_id == 2) {
								suppliesIncome += parseFloat(purchase.revenue);
								suppliesExpense = purchase.over_head_costs;
							} else if(purchase.department_id == 3) {
								equipmentIncome += parseFloat(purchase.revenue);
								equipmentExpense = purchase.over_head_costs;
							} else if(purchase.department_id == 4) {
								furnitureIncome += parseFloat(purchase.revenue);
								furnitureExpense = purchase.over_head_costs;
							}
						}
					});
					if(timeframe == 'year') {
						paperExpense *= months.length;
						suppliesExpense *= months.length;
						equipmentExpense *= months.length;
						furnitureExpense *= months.length;
					}
					var totalExpenses = parseInt(paperExpense) + parseInt(suppliesExpense) + parseInt(equipmentExpense) + parseInt(furnitureExpense);
					var table = new Table({horizontalLine: true, leftPadding: 2, rightPadding: 2});
					table.push(
						['INCOME', ''],
// 						['', ''],
						['Paper & Stationary', paperIncome.toFixed(2)],
						['Office Supplies', suppliesIncome.toFixed(2)],
						['Equipment', equipmentIncome.toFixed(2)],
						['Furniture', furnitureIncome.toFixed(2)],
// 						['', ''],
						['Total Income', totalIncome.toFixed(2)],
						['', ''],
						['EXPENSES', ''],
// 						['', ''],
						['Paper & Stationary', paperExpense.toFixed(2)],
						['Office Supplies', suppliesExpense.toFixed(2)],
						['Equipment', equipmentExpense.toFixed(2)],
						['Furniture', furnitureExpense.toFixed(2)],
// 						['', ''],
						['Total Expenses', totalExpenses.toFixed(2)],
						['', ''],
						['Net Profit/Loss', (parseFloat(totalIncome) - parseFloat(totalExpenses)).toFixed(2)]
					);
					var dateString = '';
					var padding = '';
					if(timeframe == 'month') {
						dateString = moment(answer.period, 'MM-YYYY').format('MMMM-YYYY');
					} else if(timeframe == 'year') {
						dateString = answer.period;
						padding = '      ';
					}
					console.log('\n  INCOME STATEMENT FOR DUNDER-MIFFLIN');
					console.log('   ' + padding + 'FOR PERIOD ENDING ' + dateString + '');
					console.log('' + table);
					inquirer.prompt([
						{
							name: 'back',
							message: '-----',
							type: 'list',
							choices: ['Back']
						}
					]).then(function(answer) {
						reports.view();
					});
				});
			}
		)
	}
}