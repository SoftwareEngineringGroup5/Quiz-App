var app = angular.module('quizApp',['ui.bootstrap','checklist-model']);

//constant and global function.
var WRONG = "danger";
var RIGHT = "";
//normalize text to post/get data to/from server, it remove space and special character in 'text'
var normalizeText = function(text){
	while(text.search(' ')!=-1||text.search('&')!=-1){
		text = text.replace(" ",'').replace('&','');
	}
	return text.toLowerCase();
}
var maxQuestion = 9;
//config http provider to post
app.config(['$httpProvider', function($httpProvider) {
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
}]);
//init root variables
app.run(function($rootScope) {
	$rootScope.option = "menu"; //option to change screen: menu, leaderboard, profile, answer
	$rootScope.category = "''"; //category, use for startupscreen
	//change screen
	$rootScope.changeTo = function(str){
    	$rootScope.option = str;
    };
    
});

//menu items in menu
app.directive('menuItem',function(){
	return{
		restrict: "EA",
		controller: ['$scope','$rootScope',function($scope,$rootScope){
			//enter startupscreen to begin quiz
			 $scope.enterStartupScreen = function(str){
			    	$rootScope.category = str;
			    	$rootScope.option = "answer";
			 };
		}],
		scope: {
			item: "="
		},
		templateUrl: 'static/menu-item.html'
	};
})

//profile page
app.directive("profile",function(){
	return{
		restrict: "E",
		controller: ['$scope','$http','$rootScope',function($scope,$http,$rootScope){
			//get avatars list
			$http.get('static/json/avatars.json').success(function(data) {
			        $scope.avatars = data;
			    });
			//return to menu
			$scope.backToMenu = function(){
				$rootScope.option = "menu";
			};
			//get data
			$http.get('getuserinfor').success(function(data) {
				$scope.user = data;
			});
			//confirm, send user information then back to menu
			$scope.confirm = function(){
				$http({
					method: 'POST',
					url: '/profile/',
					headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    				transformRequest: function(obj) {
	       				 var str = [];
	        			for(var p in obj)
	        			str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
	        			return str.join("&");
    				},
					data: $scope.user
				}).then(function(){
					$scope.backToMenu();
				});
			}
		}],
		scope: {},
		templateUrl: 'static/profile.html'
	}
});

//directive for startup screen
app.directive("startupScreen",function(){
	return{
		restrict: "E",
		controller: ['$scope','$rootScope','$http','$interval',function($scope,$rootScope,$http,$interval){
			$scope.inProcess = false;
			$scope.isAnswering = false;
			$scope.category = normalizeText($scope.title);
			$scope.likes = []; //to vote question
			$scope.dislikes = [];//to vote quetion
			//get user info from server
			$http.get('getuserinfor').success(function(data) {
				$scope.user = data;
			});
			//return to menu
			$scope.backToMenu = function(){
				$rootScope.option = "menu";
			};
			//start quiz when click bottom area
			$scope.beginAnswer = function(){
				$scope.end = false;
				$scope.currentQuestion = 0;
				$scope.inProcess = true;
				$scope.isAnswering = true; 
				$scope.addPoint = 0; //point added after answer a question
				$scope.results = []; //user's results, RIGHT OR WRONG
				$scope.userScore = 0;
				$scope.userAnswers = [];//user answers its type is array with multiple, boolean with true-false, string with fillblank, number with picker
				//get question from server
				$http.get('getquestionlist/' + $scope.category).success(function(data) {
			        $scope.questions = data;
			    });
			};
			//return number of right answer
			var getNumberOfRightAnswer = function(){
				var count = 0;
				for (var i = 0; i < $scope.results.length; i++) {
					if($scope.results[i]!=WRONG) count++;
				};
				return count;
			};
			//add point to user score
			var addPointToScore = function(point){
				$scope.userScore += point;
			};
			//go to next question if current question not equal 10, go to results panel when current question = 10
			var nextQuestion = function(){
				$scope.currentQuestion++;
				if($scope.currentQuestion>maxQuestion){
					$scope.numberOfRightAnswer = getNumberOfRightAnswer();
					$scope.currentQuestion--;
					$scope.isAnswering = false;
					$scope.end = true;
					postScore();
				}else{
    			    $scope.inProcess = true;
					$scope.isAnswering = true;
				}
				$interval.cancel($scope.showResult);
			};
			//enter details panel to view details about questions answered
			$scope.showDetailResult = function(){
				$scope.isAnswering = true;
				$scope.end = true;
			};
			//post score to server
			var postScore = function(){
				var sScore = $scope.userScore.toString();
				$scope.data = {
					score: sScore
				};
				$http({
					method: 'POST',
					url: '/updatescore/',
					headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    				transformRequest: function(obj) {
	       				 var str = [];
	        			for(var p in obj)
	        			str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
	        			return str.join("&");
    				},
					data: $scope.data
				}).then();
			};
			//convert all answers to type String 
			$scope.getStringAnswer = function(index){
				var options = $scope.questions[index].options;
				var answer = $scope.userAnswers[index];
				var type = $scope.questions[index].type;
				if(type=='multi-select'){
					var stringAns = "";
					for(i = 0;i<answer.length;i++){
						stringAns = stringAns + options[answer[i]] +",";
					}
					return stringAns;
				}else if(type=='true-false'){
					return Boolean(answer);
				}else if(type=='fill-two-blanks'){
					return answer[0]+","+answer[1];
				}
				else if(type=='picker'||type=='fill-blank'){
					return answer;
				}else{
					return options[answer];

				}
			}
			//reset all process
			$scope.resetProcess = function(){
				$scope.inProcess = false;
			};
			//confirm answer when click confirm button, check answer and add point to score
			$scope.confirmAnswer = function(){	
    			if(checkAnswer()){
    				$scope.addPoint = 10;
    				$scope.results[$scope.currentQuestion] = RIGHT;
    			}else{
    				$scope.addPoint = 0;
    				$scope.results[$scope.currentQuestion] = WRONG;
    			}		
    			addPointToScore($scope.addPoint);	
    			//show result of current questions
    			$scope.isAnswering = false;
    			//change to next question after show result 1500ms 
    			$scope.showResult = $interval(nextQuestion,1500);
			};
			//check whether user's answer is true or false
			var checkAnswer = function(){
				if($scope.questions[$scope.currentQuestion].type=='multi-select'){
					if ($scope.userAnswers[$scope.currentQuestion].length!=$scope.questions[$scope.currentQuestion].answer.length) return false;
					$scope.userAnswers[$scope.currentQuestion].sort(function(a, b){return a-b});
					for(i = 0;i<$scope.questions[$scope.currentQuestion].answer.length;i++)
						if($scope.questions[$scope.currentQuestion].answer[i]!=$scope.userAnswers[$scope.currentQuestion][i]) return false;
					return true;
				}
				else if($scope.questions[$scope.currentQuestion].type=='fill-two-blanks'){
					for(i = 0;i<$scope.questions[$scope.currentQuestion].answer.length;i++)
						if($scope.questions[$scope.currentQuestion].answer[i]!=$scope.userAnswers[$scope.currentQuestion][i]) return false;
					return true;
				}
				else{
					if($scope.userAnswers[$scope.currentQuestion]==$scope.questions[$scope.currentQuestion].answer) return true;
					else return false;
				}
			}
			//vote question, votedArray is likes (dislikes), reverse array is dislikes (like), id is id of question)
			$scope.vote = function(votedArray,reverseArray,id){
				var i = votedArray.indexOf(id);
				var j = reverseArray.indexOf(id);
				if(i==-1&&j==-1) votedArray.push(id); //when user has not voted this question yet
				else if (i!=-1) votedArray.splice(i, 1);//when user voted this quesion in the voted array so ignore that voting
				else if (j!=-1){ //when user voted reverse array,so remove vote in the reverse and vote the voted array
					reverseArray.splice(j, 1);
					votedArray.push(id);
				}
			}
			//send user's vote to server
			$scope.postVote = function(){
				$scope.voteData = {
					votelist: '',
					dislike:''
				};
				$scope.voteData.votelist = $scope.likes.join();
				$scope.voteData.dislike = $scope.dislikes.join();
				$http({
					method: 'POST',
					url: '/questionrate/',
					headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    				transformRequest: function(obj) {
	       				 var str = [];
	        			for(var p in obj)
	        			str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
	        			return str.join("&");
    				},
					data: $scope.voteData
				}).then();
				$scope.resetProcess();
			}
			//get color class when voting
			$scope.getColorClass = function(array,id){
				if(array.indexOf(id)==-1) return 'unactive';
				else return 'active';
			}
		}],
		scope: {
			title: "="
		},
		templateUrl: 'static/startup-screen.html'
	}
});

//leader board, show list of top player and their scores
app.directive('leaderboard',function(){
	return{
		restrict: "E",
		controller: ['$scope','$rootScope','$http',function($scope,$rootScope,$http){
			$http.get('getleaderboard').success(function(data) {
				$scope.players = data;
			});
			//return to menu
			$scope.backToMenu = function(){
				$rootScope.option = "menu";
			};
		}],
		templateUrl: 'static/leaderboard.html'
	};
});

//directive for profilebar, it is top bar of menu screen
app.directive('profileBar',function(){
	return{
		restrict: "E",
		controller: ['$scope','$rootScope','$http',function($scope,$rootScope,$http){
			$http.get('getuserinfor').success(function(data) {
				$scope.user = data;
			});
		}],
		templateUrl: 'static/profile-bar.html'
	}
});