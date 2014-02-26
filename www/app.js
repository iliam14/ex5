/**
 * Created by Ilia Merin on 12/02/14.
 */
var todoApp = angular.module('todoApp', ['ngRoute']);

var dbg = {};

todoApp.filter('orderObjectBy', function() {
    return function(items, field, reverse) {
        var filtered = [];
        angular.forEach(items, function(item) {
            filtered.push(item);
        });
        filtered.sort(function (a, b) {
            return (a[field] > b[field]);
        });
        if(reverse) filtered.reverse();
        return filtered;
    };
});

todoApp.controller('loginCtrl', function($scope,$location){
   // $scope.okLogin = 'hello';
    $scope.msgStyle = {};
    $scope.login = function()
    {
            var usernameVal = $("#username");
            var passwordVal = $("#pass");
            $.ajax({
                url: '/login',
                data:{username:usernameVal.val(),pass:passwordVal.val()},
                type: 'GET',
                dataType:'json',
                success: function(items){
                    $scope.$apply(function() {
                        $location.path("/logged")
                    });
                },
                error: function(items){
                    $scope.$apply(function() {
                        $scope.okLogin = 'fail wrong login';
                        $scope.msgStyle = {color:"red"};
                    });
                }
            });

    };
});
todoApp.controller('registerCtrl', function($scope,$location){

    $scope.okRegister ='';
    $scope.msgStyle = {};
    $scope.registering = function()
    {
        if(verify())
        {
            var fullnameVal = $("#fullname");
            var usernameVal = $("#username");
            var passwordVal = $("#password");
            $.ajax({
                url: '/register',
                data:{fullname:fullnameVal.val(),username:usernameVal.val(),password:passwordVal.val()},
                type: 'POST',
                dataType:'json',
                success: function(items){
                    $scope.$apply(function() {
                        $location.path("/logged")
                    });
                   // window.location.href = '#logged'


                },
                error: function(items){
                    $scope.$apply(function() {
                        $scope.okRegister = 'Register failed';
                        $scope.msgStyle = {color:'red'};
                    });
                }
            });
        }
        else
        {
            $scope.okRegister = 'Invalid password';
            $scope.msgStyle={color:'red'};
        }
    };


});

todoApp.controller('itemCtrl', function($scope, $http,$location){
    $scope.items ={};
    $scope.editedItem = -1;
    $http.get('/item').success(function(data) {
        $scope.items = data;
    }).error(function(item){
            dbg=item;
            $scope.okLogin = item;
            $location.path("/login");
        });

    $scope.submitItem = function()
    {
        var newItemName = $("#newItemName");
           $.ajax({
                url: '/item',
                data:{name:newItemName.val()},
                type: 'POST',
                dataType:'json',
                success: function(){
                    $http.get('/item').success(function(data) {
                        dbg=data;
                        $scope.items = data;
                    });
                },
               error: function(items){
                   $scope.$apply(function() {
                       $location.path("/register");
                   });
               }
            });
    }

    $scope.deletItem = function(itemID)
    {
        $.ajax({
            url: '/item',
            data:{id:itemID},
            type: 'DELETE',
            dataType:'json',
            success: function(){
                $http.get('/item').success(function(data) {
                    dbg=data;
                    $scope.items = data;
                });
            },
            error: function(items){
                $scope.$apply(function() {
                    $location.path("/register");
                });
            }
        });
    }

    $scope.doneItem = function(itemID)
    {
        $.ajax({
            url: '/item',
            data:{id:itemID,
                name: $scope.items[itemID].text,
                status: ! $scope.items[itemID].status},
            type: 'PUT',
            dataType:'json',
            success: function(){
                $http.get('/item').success(function(data) {
                    dbg=data;
                    $scope.items = data;
                });
            },
            error: function(items){
                $scope.$apply(function() {
                    $location.path("/register");
                });
            }
        });
    }

    $scope.startEdit = function(itemID){
        $scope.editedItem = itemID;
    }
    $scope.endEdit = function(itemID){
        $scope.editedItem = -1;
        $.ajax({
            url: '/item',
            data:{id:itemID,
                name: $scope.items[itemID].text,
                status: $scope.items[itemID].status},
            type: 'PUT',
            dataType:'json',
            success: function(){
                $http.get('/item').success(function(data) {
                    dbg=data;
                    $scope.items = data;
                });
            },
            error: function(items){
                $scope.$apply(function() {
                    $location.path("/register");
                });
            }
        });
    }
    $scope.editingItem = function(itemID){
        return $scope.editedItem == itemID;
    }





});

todoApp.config(function($routeProvider){
    $routeProvider.
        when('/login',{
            templateUrl:'login.html',
            controller:'loginCtrl'
        }).
        when('/register',{
            templateUrl: 'register.html',
            controller:'registerCtrl'
        }).
        when('/logged',{
            templateUrl: 'todoApp.html',
            controller:'itemCtrl'
        }).
        otherwise({
            redirectTo: '/register'
        })
});