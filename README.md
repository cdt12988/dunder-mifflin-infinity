# Dunder-Mifflin Infinity

Dunder-Mifflin Infinity is a Command Line Interface storefront application and content management system.  The app allows different users access to different areas of the application using a custom user authentication system.  The application tracks customer orders, stock inventory, and even performs some basic financial reporting.

Video Tutorial: [https://www.youtube.com/watch?v=h1EW2qJPU7c&feature=youtu.be](https://www.youtube.com/watch?v=h1EW2qJPU7c&feature=youtu.be)

![Screenshot](https://cdt12988.github.io/images/portfolio/dmi.jpg "Dunder-Mifflin Infinity Screenshot")

## Getting Started

I have provided SQL schema and seed files, as well as a package.json file if you would like to install and run the application on your own computer.

### Installation

#### Node Packages

To install this app, first download or clone the Git Repository to your computer.  Then in your command line application, ensure you are within the repo directory and issue the following command to install all of the necessary packages for the app to run properly. Note that you must already have Node.js installed on your machine for this to work.

```
npm install
```

#### MySQL

After the packages are installed, you will need to create the MySQL database that accompanies this app.  The schema.sql and seed.sql files can be imported or used to create the database for you.  You can use the files either directly in your command line application or in your preferred MySQL design tool if you have one.  Note again that you must have MySQL already installed and running on your machine for this to work.

#### Products CSV

After you get the node packages and database installed, you can easily populate the products table of the database using the products.csv file that is also included in the repo.  Simply import this file into the products table and you have instant data to start working with!

Once all of these steps have been taken, you are ready to run the app for yourself.  

#### Default Users

Note that installing the app in this way creates a couple of default users for the CMS portion of the app.  The two users created are:

```
test_manager
test_admin
```

Both of these users will have a default password of "Temp123" to allow them access into the manager and admin areas of the map respectively.

## Using the App

### Customers

The customer storefront can be accessed either with a customer account or as a guest.  Once within the storefront, customers can search for products by ID number or name.  They can also browse through products by departments.  Once products have been added to the customer's shopping cart, the customer can edit the quantity, remove the product from the shopping cart, or proceed to checkout.  If a user is logged into a customer account when they checkout, their purchases will be saved to their purchase history.

### Managers

When a user logs into a manager account, they are not taken to the storefront area, but instead to the manager area where they are able to perform different managerial tasks.  From this area, users can view products in various ways, add new products, and edit or delete existing products.  Managers are also alerted about products with low inventory in order to ensure more quantities can be added.  Lastly, managers are able to view customer purchases in total or by month.

### System Administrators

The highest level of user account is a system administrator.  A system admin has all of the same permissions and capabilities as a manager, but also has the ability to view financial reports by either month or year.  System admins also are able to manage all other users of the application.  They can create new users, edit the username or permissions of existing users, reset user passwords, or deactivate user accounts.

## Developer Notes

### Developer's Toolkit

The Dunder-Mifflin Infinity Storefront App is written in Node.js and uses a MySQL database to store all of its data.  It also uses the following NPM packages:

* MySQL

* Inquirer

* BCrypt

* Moment

* Terminal-Table

### Contributors

Cody Thompson is the only contributor.