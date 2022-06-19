const express = require("express")
const bodyParser = require("body-parser");
const { urlencoded } = require("express");
const mongoose = require("mongoose");
const date = require(__dirname + "/date.js");
const _ = require("lodash")
const env = require('dotenv').config()

const app = express()
const mongoAtlasUri = process.env.MONGODB_URL
//const mongoAtlasUri = "mongodb://localhost:27017/todolistDB"
app.set('view engine', 'ejs');//this is to use ejs 

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public")) //this to run static files

//connect to the database
try {
    // Connect to the MongoDB cluster
     mongoose.connect(
      mongoAtlasUri,
    //   { useNewUrlParser: true, useUnifiedTopology: true },
      () => console.log("Mongoose is connected")
    );

} catch (e) {
    console.log("could not connect");
}
const dbConnection = mongoose.connection;
dbConnection.on("error", (err) => console.log(`Connection error ${err}`));
dbConnection.once("open", () => console.log("Connected to DB!"));
//creating the item schema

const itemsSchema ={
    name: String
};

const Item = mongoose.model("Item", itemsSchema);

//creating the mongoose items in the model
const item1 = new Item({
    name: "Welcome to your todolist!"
});
const item2 = new Item({
    name: "Hit the + button to add a new item"
});
const item3 = new Item({
    name: "<--- Hit this to delete an item"
});

const defaultItems = [item1, item2, item3];

const listSchema = {
    name: String, 
    items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);

//home route
app.get('/', function(req, res){ //response for the server
    let day = date.getDate()

    Item.find({}, function(err, foundItems){ //find method this is going to return an array
        if(foundItems.length === 0){
            Item.insertMany(defaultItems, function(err){
                if (err){
                    console.log(err);
                }else{
                    console.log("Successfully saved the default items to DB");
                }
            });
            res.redirect("/");
        }else{
            res.render("list", {listTitle: day, newListItems: foundItems});
        }
    })
});

//add new item
app.post('/', function(req, res){
    const itemName = req.body.inputdata;
    const listName = req.body.list;
    let day = date.getDate()

    const item = new Item({
        name: itemName
    });

    if(listName === day){
        item.save();// save to the collection
        res.redirect("/");   
    } else{
        List.findOne({name: listName}, function(err, foundList){
            foundList.items.push(item);
            foundList.save();
            res.redirect("/" + listName);
        });
    }
});

//Custom list
app.get("/:customListName", function(req, res){
    const customListName = _.capitalize(req.params.customListName);
    
    List.findOne({name: customListName}, function(err, foundList){ //findOne method is to return an object
        if(!err){
            if(!foundList){
                //create a new list
                const list = new List({
                    name: customListName, 
                    items: defaultItems
                });
                list.save();//save to collection
                res.redirect("/" + customListName);
            }else{
                //show an exisiting list
                res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
            }
        }
    })

});

//delete item
app.post("/delete", function(req, res){
    const checkedItemID = req.body.checkbox;
    const listName = req.body.listName;
    let day = date.getDate()

    if(listName === day){
        Item.findByIdAndRemove(checkedItemID, function(err){
            if(!err){
                res.redirect('/');
            }
        });
    } else{
        List.findOneAndUpdate({name: listName},{$pull: {items: {_id: checkedItemID}}}, function(err, foundList){
            if(!err){
                res.redirect("/" + listName);
            }
        });
    }
});

//setting up the port 
let port = process.env.PORT 
if (port == null || port == ""){
    port = 3000;
}
app.listen( port,function(req, res){
    console.log("Server is running on port 3000");
});