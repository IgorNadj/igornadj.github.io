"use strict";

(function(){
angular
	.module('nextseason', [])
	.service('api', ['$http', function($http){
		var apiUrl = API_URL;
		return function(action, params){
			return $http({
				url: apiUrl + '/' + action,
				params: params
			});
		}
	}])
	.controller('upcoming', ['$scope', 'api', function($scope, api){
		var GET_COUNT = 100;
		$scope.rows = {
			all: [],
			popular: [],
			faves: []
		};
		$scope.view = 'popular';
		$scope.gotAll = {
			all: false,
			popular: false,
			faves: false
		};
		$scope.loading = {
			all: false,
			popular: false,
			faves: false
		};
		$scope.faveIdsLoaded = {};
		$scope.faveIdsToLoad = null;
		$scope.loadMore = function(){
			var view = $scope.view;
			if($scope.gotAll[view]) return;
			if($scope.loading[view]) return;
			$scope.loading[view] = true;
			var url;
			var params;
			if(view == 'faves'){
				if(!$scope.faveIdsToLoad){
					// missing ids
					$scope.loading[view] = false;
					return;
				}
				var id = $scope.faveIdsToLoad.pop();
				if($scope.faveIdsToLoad.length == 0) $scope.faveIdsToLoad = null;
				if($scope.faveIdsLoaded[id] !== undefined){
					// already got this one, try next
					$scope.loading[view] = false;
					scope.loadMore();
					return;
				}
				url = 'show';
				params = { 
					id: id
				};
			}else{
				url = 'shows/returning/'+view;
				var start = $scope.rows[view].length;
				params = { 
					start: start, 
					count: GET_COUNT 
				};
			}
			api(url, params)
			.then(function(response){
				for(var i in response.data){
					var row = response.data[i];
					row.thumb_url = null;
					if(row.tmdb_poster_path){
						row.thumb_url = '//image.tmdb.org/t/p/w185' + row.tmdb_poster_path; 
					}else{
						row.thumb_url = 'theme/img/missing-poster.jpg';
					}
					row.tmdb_link = null;
					if(row.tmdb_id){
						row.tmdb_link = 'https://www.themoviedb.org/tv/' + row.tmdb_id; 
					}
					$scope.rows[view].push(row);
				};
				if(response.data.length == 0){
					if(view == 'faves'){
						// faves, special case
						console.log('todo: show some kinda message');
						$scope.faveIdsLoaded[params.id] = false; // so we don't try loading again
					}else{
						// we're at the end
						$scope.gotAll[view] = true;
					}
				}else{
					if(view == 'faves'){
						// faves
						$scope.faveIdsLoaded[params.id] = true;	
						$scope.saveFaves();
					}
				}
				$scope.loading[view] = false;
				if(view == 'faves') $scope.loadMore(); // in case we have multiple ids, try next
			});
		};
		$scope.$watch('view', function(){
			$scope.loadMore();
		});
		$scope.saveFaves = function(){
			var arr = [];
			for(var i in $scope.faveIdsLoaded){
				arr.push(i);
			}
			window.location.hash = arr.join(',');
		};
		$scope.init = function(){
			if(window.location.hash){
				$scope.view = 'faves';
				var ids = window.location.hash.replace('#','').split(',');
				$scope.faveIdsToLoad = ids;
			}
			$scope.loadMore();
		};
		$scope.init();
	}])
	.directive('autocompleteShows', ['api', function(api){
		return function(scope, elm, attr){
        	elm.autocomplete({
        		source: function(request, response){
        			api('shows/autocomplete', { q: request.term })
        			.then(function(apiResponse){
        				var r = [];
        				for(var i in apiResponse.data){
        					r.push({ value: apiResponse.data[i].id, label: apiResponse.data[i].name });
        				}
        				response(r);
        			});
        		},
				focus: function( event, ui ) {
					elm.val(ui.item.label);
					return false;
				},
				select: function(event, ui){
					scope.$apply(function(){
						scope.view = 'faves';
						scope.faveIdsToLoad = [ui.item.value];
						scope.loadMore();
					});
					elm.val(ui.item.label);
					return false;
				}
        	});
        	elm.click(function(){ elm.select(); });
		}
	}])
	.directive('infiniteScroll', ['$document', function($document){
    	return function(scope, elm, attr){
        	var raw = elm[0];
        	$document.bind('scroll', function(){
        		var lowestPixelSeen = $('body').scrollTop() + window.innerHeight;
        		var lastElementOffset = $(raw).children().last().offset().top;
            	if(lowestPixelSeen > lastElementOffset){
                	scope.$apply(attr.infiniteScroll);
            	}
        	});
    	};
	}])
	.directive('imageBackgroundColor', function(){
		return {
			link: function(scope, element, attrs){
				var imgEl = element.find('img').first()[0];
				if(!imgEl){
					return;
				}
				if(!window.colorThief) window.colorThief = new ColorThief();
				imgEl.crossOrigin = 'Anonymous';
				imgEl.onload = function(){
					try{
						var rgb = window.colorThief.getColor(imgEl);
						var rgbObj = { r: rgb[0], g: rgb[1], b: rgb[2] };
						var color1 = tinycolor(rgbObj).lighten();
						var color2 = tinycolor(rgbObj).desaturate();
						if(color1.isDark()){
							color1.lighten(70);
							color2.lighten(60);	
						} 
						var gradStr = 'linear-gradient(-15deg, '+color1+', '+color2+')';
						element.css('background', gradStr);
					}catch(e){
						console.log(e);
					}
				};
			}
		}
	});
	
})();