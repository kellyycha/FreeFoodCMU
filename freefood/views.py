from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.http import HttpResponse, Http404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login #, logout
from freefood.models import Event

from django.utils import timezone
from django.utils.formats import date_format

import json
import datetime 
from datetime import date
from freefood.forms import *
from freefood.models import *

# OAuth additions
from webapps.settings import BASE_DIR, FREEFOOD_USERS, FREEFOOD_TITLE


def _known_user_check(action_function):
    def my_wrapper_function(request, *args, **kwargs):
        if 'title' not in request.session:
            request.session['title'] = FREEFOOD_TITLE

        if 'picture' not in request.session:
            request.session['picture'] = request.user.social_auth.get(provider='google-oauth2').extra_data['picture']

        if isinstance(FREEFOOD_USERS, str):
            if request.user.email.endswith(FREEFOOD_USERS):
                return action_function(request, *args, **kwargs)
            message = f"You must use an e-mail address ending with {FREEFOOD_USERS}"
            print("message", message)
            return render(request, 'freefood/oauth_check.html', {'message': message})
        else:
            print("befoe assert\n")
            assert isinstance(FREEFOOD_USERS, list)
            print("after assert")
            for pattern in FREEFOOD_USERS:
                if request.user.email == pattern:
                    return action_function(request, *args, **kwargs)
            message = "You're not authorized to use this application"
            return render(request, 'freefood/oauth_check.html', {'message': message})

    return my_wrapper_function


@login_required
@_known_user_check
def index(request):
    
    # initialize list to only hold 4 events each
    recent_events, popular_events, top_events = [None]*4, [None]*4, [None]*4

    # events that are recommended should be for today and available
    today = date.today()
    today_avail_events = Event.objects.filter(date = today, available = True) 

    for i in range(4):
        if i < len(today_avail_events):
            # top 4 are populated into list by category
            recent_events[i] = today_avail_events.order_by('-create_date')[i]
            popular_events[i] = today_avail_events.order_by('-num_views')[i]
            top_events[i] = today_avail_events.order_by('-rating')[i]
    
    context = {
        "popular": popular_events,
        "top": top_events,
        "recent": recent_events,
    }

    return render(request, "freefood/index.html", context)    

@login_required
@_known_user_check
def heatmap(request):
    return render(request, "freefood/heatmap.html", {}) 

@login_required
@_known_user_check
def map(request):
    
    context = dict()

    restrictions_label = "Restrictions"
    if "RestrictionsForm" in request.session:
        initial = {
            "veg": request.session["RestrictionsForm"]["veg"],
            "vn": request.session["RestrictionsForm"]["vn"],
            "df": request.session["RestrictionsForm"]["df"],
            'gf': request.session["RestrictionsForm"]["gf"], 
        }
        form = RestrictionsForm(initial=initial)
        
        label_info = []
        for type in initial:
            if initial[type]:
                label_info.append(type.capitalize())
        label = "Restrictions" if (len(label_info) == 0) else " • ".join(label_info)
        restrictions_label = label
    else:
        form = RestrictionsForm()
    context["RestrictionsForm"] = form
    context["RestrictionsLabel"] = restrictions_label


    date_range_label = "Date Filter"
    if "DateRangeForm" in request.session:
        # Accessing form from the session. 
        initial = {
            "startDate": request.session["DateRangeForm"]["startDate"],
            "endDate": request.session["DateRangeForm"]["endDate"],
        }
        form = DateRangeForm(initial=initial)

        s_date = initial["startDate"][5:].replace('-', '/')
        e_date = initial["endDate"][5:].replace('-', '/')
        if (len(s_date) != 0) or (len(e_date) != 0):
            date_range_label = f"{s_date} - {e_date}"
    else:
        form = DateRangeForm()
    context["DateRangeForm"] = form
    context["DateRangeLabel"] = date_range_label



    # Add the sort method to the cookies if necessary, and put string to init
    # the "Sort Button Text" (check the template to change it)
    if "SortMethod" not in request.session:
        request.session["SortMethod"] = "recent"
    context["sortMethod"] = request.session['SortMethod'].capitalize()


    # "Show happening now" button. 
    if ("HappeningNow" not in request.session):
        request.session["HappeningNow"] = False
    context["HappeningNow"] = request.session["HappeningNow"]
    
    return render(request, "freefood/map.html", context)

# returns a list of the types of dietary options
def list_diet(veg,vn,df,gf):
    dietary_options = []
    if veg:
        dietary_options.append("Vegetarian")
    if vn:
        dietary_options.append("Vegan")
    if df:
        dietary_options.append("Dairy-Free")
    if gf:
        dietary_options.append("Gluten-Free")
    return dietary_options

# internal helper to get the user's preexisting rating for some event. 
# returns 0 if none exist. 
def _get_user_existing_rating(request, event):
    user = User.objects.get(id=request.user.id)

    user_ratings = event.ratings.filter(user=user)
    if (len(user_ratings) == 0):
        return 0
    else:
        return user_ratings.first().value
    

# Opens up the "details" of an event
@login_required
@_known_user_check
def event_view(request, id):
    # Get the Event
    event = Event.objects.get(id=id)

    get_profile(request)

    # Compute the context
    context = {
        "id": event.id,
        "title": event.name_of_event,
        "location": event.building_name + ' ' + event.room_number,
        "latlng": str(event.location_lat) + ',' + str(event.location_lng),
        "date": date_format(event.date, "n/j/Y"),
        "time": (date_format(event.start_time, "g:i") + " - " + date_format(event.end_time, "g:i A")) if (event.end_time) else (date_format(event.start_time, "g:i A")),
        "dietary_options": list_diet(event.veg, event.vn, event.df, event.gf),
        "food": event.food,
        "notes": event.notes,
        "img_ids": [img.id for img in event.images.all()],                      # get a list of image id's associated with the event.
        "img_avail": False if (event.images.all().last() == None) else True,    # Is there even an image available (display a default if none are available).
        "rating": round(event.rating),
        "rating_precise": round(event.rating, 2),
        "rating_num": event.rating_num,
        "preexisting_rating": _get_user_existing_rating(request, event),        # get the user's preexisting rating for the event.
        "available": event.available, 
    }

    if request.method == "POST":
        form = UploadImageForm(request.POST, request.FILES)

        if form.is_valid():
            try:
                EventImage.objects.create(
                    image = form.cleaned_data['image'],
                    content_type = form.cleaned_data['image'].content_type,
                    event = event,
                )

                # Recalculate the following
                context["img_ids"] = [img.id for img in event.images.all()]
                context["img_avail"] = False if (event.images.all().last() == None) else True
                # Fall through 
            except:
                # Something didn't work...
                print("failed to save new image")
                context["imageForm"] = form
                return render(request, "freefood/event_view.html", context)
        else:
            context["imageForm"] = form
            return render(request, "freefood/event_view.html", context)
    else:
        # user is visiting the page
        # increment event's "num_views" to keep track of a metric for "popularity"
        event.num_views = event.num_views + 1
        event.save()

    # Get a new image form
    context["imageForm"] = UploadImageForm()

    return render(request, "freefood/event_view.html", context)


# Helper for shoving data from a form into a "event" object.
# Probably a better way of doing this, but ¯\_(ツ)_/¯ good to be explicit
def _event_form_data_to_event(request, new_event, form):
    new_event.name_of_event = form.cleaned_data['name_of_event']
    new_event.food = form.cleaned_data['food']
    new_event.veg = form.cleaned_data['veg']
    new_event.vn = form.cleaned_data['vn']
    new_event.df = form.cleaned_data['df']
    new_event.gf = form.cleaned_data['gf']
    new_event.date = form.cleaned_data['date']
    new_event.start_time = form.cleaned_data['start_time']
    new_event.end_time = form.cleaned_data['end_time']
    new_event.link = form.cleaned_data['link']
    new_event.notes = form.cleaned_data['notes']
    new_event.location_lat = form.cleaned_data['location_lat']
    new_event.location_lng = form.cleaned_data['location_lng']
    new_event.building_name = form.cleaned_data['building_name']
    new_event.room_number = form.cleaned_data['room_number']
    new_event.save()

    if form.cleaned_data['image']:
        try:
            EventImage.objects.create(
                image = form.cleaned_data['image'],
                content_type = form.cleaned_data['image'].content_type,
                event = new_event,
            )
        except:
            print("¯\_(ツ)_/¯") ##

@login_required
@_known_user_check
def delete_event(request, id):
    # Validate that the user actually created the event. 
    event = Event.objects.get(id = id)
    if request.user.id != event.user.id:
        return redirect(reverse("map"))
    
    event.delete()
    return redirect(reverse("profile"))


@login_required
@_known_user_check
def edit_event(request, id):

    # Validate that the user actually created the event. 
    event = Event.objects.get(id = id)
    if request.user.id != event.user.id:
        return redirect(reverse("map"))

    context = {
        "id": id
    }
    if request.method == 'GET':
        context["form"] = EventForm(instance=event)
        return render(request, 'freefood/edit_event.html', context)
    
    form = EventForm(request.POST, request.FILES)
    context['form'] = form

    # Validates the form.
    if not form.is_valid():
        return render(request, 'freefood/edit_event.html', context)

    # Use validated form to update the event. 
    _event_form_data_to_event(request, event, form)

    return redirect(reverse("profile"))


@login_required
@_known_user_check
def new_event(request):
    context = {}
    if request.method == 'GET':
        context = {'form': EventForm()}
        return render(request, 'freefood/new_event.html', context)

    form = EventForm(request.POST, request.FILES)
    context['form'] = form

    # Validates the form.
    if not form.is_valid():
        return render(request, 'freefood/new_event.html', context)

    new_event = Event()
    new_event.user = request.user
    _event_form_data_to_event(request, new_event, form)

    profile = get_profile(request)
    profile.events.add(new_event)
    profile.save()

    return redirect(reverse("map"))


def get_profile(request):
    try:
        #get existing profile
        profile = get_object_or_404(User, id=request.user.id).profile
    except:
        #initialize profile
        profile = Profile(user=request.user, picture=request.session['picture'])
        profile.save()
    return profile


@login_required
@_known_user_check
def profile(request):
    profile = get_profile(request)

    content = {
        "profile": profile,
        "events": profile.events.order_by('-create_date').all()
    }
    return render(request, 'freefood/my_profile.html', content)

# Get map marker history in any order.
@login_required
@_known_user_check
def get_map_history(request):
    response_data = []

    for event in Event.objects.all():
        response_data.append({
            "latitude": event.location_lat,
            "longitude": event.location_lng,
        })

    response_json = json.dumps(response_data, default=str)
    return HttpResponse(response_json, content_type='application/json')


# From the list of markers in the request page
@login_required
@_known_user_check
def get_map_markers(request):
    response_data = []

    ############################################################################
    # Filters:
    ############################################################################
    filter_objs = Event.objects
    if "RestrictionsForm" in request.session:
        # Accessing form from the session.
        if (request.session["RestrictionsForm"]["veg"]):
            filter_objs = filter_objs.filter(veg=True)
        if (request.session["RestrictionsForm"]["vn"]):
            filter_objs = filter_objs.filter(vn=True)
        if (request.session["RestrictionsForm"]["df"]):
            filter_objs = filter_objs.filter(df=True)
        if (request.session["RestrictionsForm"]["gf"]):
            filter_objs = filter_objs.filter(gf=True)
        
    if "DateRangeForm" in request.session:
        if (request.session["DateRangeForm"]["startDate"] and request.session["DateRangeForm"]["startDate"] != "None"):
            filter_objs = filter_objs.filter(date__gte = request.session["DateRangeForm"]["startDate"])
        else:
            t = timezone.now()
            filter_objs = filter_objs.filter(date__gte = t)

        if (request.session["DateRangeForm"]["endDate"] and request.session["DateRangeForm"]["endDate"] != "None"):
            filter_objs = filter_objs.filter(date__lte = request.session["DateRangeForm"]["endDate"])

    # NOTE: The name of this tag is not exactly accurate. 
    if ("HappeningNow" in request.session and bool(request.session["HappeningNow"])):
        # Filter out the ones that are inactive.
        filter_objs = filter_objs.filter(available=True)


    ############################################################################
    # Sorting
    ############################################################################
    # Set default SortMethod to "recent". 
    if "SortMethod" not in request.session:
        request.session["SortMethod"] = "recent"
    
    # default to having everything sorted with most recent entries at top
    sorted_objs = filter_objs.order_by('-create_date')

    if (request.session["SortMethod"] == "rating"):
        sorted_objs = sorted_objs.order_by('-rating')

    elif (request.session["SortMethod"] == "popularity"):
        sorted_objs = sorted_objs.order_by('-num_views')
        
    elif (request.session["SortMethod"] == "comments"):
        sorted_objs = sorted_objs.order_by('-num_comments')


    ############################################################################
    # Build the response with info from the database. 
    # TODO: Fix the marker colors!
    ############################################################################
    for event in sorted_objs.all():
        t = timezone.now() # returns a datetime object. 
        s_time = datetime.datetime(event.date.year, event.date.month, event.date.day, 
                                   event.start_time.hour, event.start_time.minute);

        marker_color = ""

        # Hasn't started yet
        if (s_time > t):
            marker_color = "#828282" # grey
        elif (not event.available):
            marker_color = "#ff0d00" # red
        else:
            marker_color = "#0c5912" # green

        event_details = {
            "user": event.user.username,
            "latitude": event.location_lat,
            "longitude": event.location_lng,
            "title" : event.name_of_event,
            "location": event.building_name,
            "date": date_format(event.date, "n/j/Y"),
            "time": (date_format(event.start_time, "g:i") + " - " + date_format(event.end_time, "g:i A")) if (event.end_time) else (date_format(event.start_time, "g:i A")),
            "dietary_options": list_diet(event.veg, event.vn, event.df, event.gf),
            "food": event.food,
            "id": event.id,
            "rating": round(event.rating),
            "rating_num": event.rating_num,
            "background": marker_color,
            "borderColor": "white",
            "glyphColor": "white",

            # Could also try using a default image if no image exists for the current event. If this is false, do not display an image at all. 
            "img_avail": False if (event.images.all().last() == None) else True,
        }
        response_data.append(event_details)

    # response_data = response_data + dummy_data

    response_json = json.dumps(response_data, default=str)
    return HttpResponse(response_json, content_type='application/json')



# NOTE that "event.rating_num" is a bit depreciated, though is still being used
# in this function. 
@login_required
@_known_user_check
def add_rating(request, event_id, new_rating):
    if (new_rating < 0) or (new_rating > 5):
        return redirect(reverse("map"))

    # user that is creating the rating.
    user = User.objects.get(id=request.user.id)

    # event that a rating should be added/updated with
    event = Event.objects.get(id=event_id)

    user_event_rating_set = event.ratings.filter(user=user)

    totalRating = event.rating * event.rating_num

    if len(user_event_rating_set) == 0:
        # Create a new rating
        Rating.objects.create(event=event, user=user, value=int(new_rating))
        
        event.rating_num += 1
        event.rating = (totalRating + int(new_rating)) / (event.rating_num)
    else:
        # get the rating
        rating = user_event_rating_set.first()

        if (new_rating == 0):
            event.rating_num -= 1
            if event.rating_num == 0:
                event.rating = 0.0
            else:
                event.rating = (totalRating - rating.value) / (event.rating_num)
            rating.delete()
        else:
            # remove previous rating value and add the new rating value. 
            event.rating = (totalRating + int(new_rating) - rating.value) / (event.rating_num)

            # update the rating
            rating.value = int(new_rating)
            rating.save()
    
    event.save()

    # return some data back so the page can be updated. 
    data = {
        "rating": round(event.rating),
        "ratingPrecise": round(event.rating, 2),
        "ratingNum": event.rating_num,
    }
    response_json = json.dumps(data, default=str)
    return HttpResponse(response_json, content_type='application/json')


# These two are just some simple functions handy for quickly changing availability
@login_required
@_known_user_check
def availability_finished(request, event_id):
    event = Event.objects.get(id=event_id)
    event.available = False
    event.save()
    return HttpResponse('')
@login_required
@_known_user_check
def availability_available(request, event_id):
    event = Event.objects.get(id=event_id)
    event.available = True
    event.save()
    return HttpResponse('')


# This stores a new DateRangeForm in the user's request.session. 
# It also tracks when the DateRangeForm is stored in the request.session. 
@login_required
@_known_user_check
def update_date(request):
    form = DateRangeForm(request.POST)
    if form.is_valid():
        # Could potentially use form.cleaned_data, though need to convert 
        # datetime.date() objects to a string first... easier to do verbosely
        filters = {
            "startDate": str(form.cleaned_data['startDate']),
            "endDate": str(form.cleaned_data['endDate']),

            "creationDate":str(datetime.date.today()), # keep track of creation
        }
        request.session["DateRangeForm"] = filters
    return get_map_markers(request)


@login_required
@_known_user_check
def update_dietary_restrictions(request):
    form = RestrictionsForm(request.POST)
    if form.is_valid():
        filters = {
            "veg": (form.cleaned_data['veg']),
            "vn": (form.cleaned_data['vn']),
            "df": (form.cleaned_data['df']),
            "gf": (form.cleaned_data['gf']),

            "creationDate":str(datetime.date.today()), # keep track of creation
        }
        request.session["RestrictionsForm"] = filters
    return get_map_markers(request)

@login_required
@_known_user_check
def updateAllFilters(request):
    form = AllFiltersForm(request.POST)
    if form.is_valid():
        filters = {
            "veg": (form.cleaned_data['veg']),
            "vn": (form.cleaned_data['vn']),
            "df": (form.cleaned_data['df']),
            "gf": (form.cleaned_data['gf']),

            "creationDate":str(datetime.date.today()), # keep track of creation
        }
        request.session["RestrictionsForm"] = filters


        request.session["SortMethod"] = form.cleaned_data['sort'].lower()
        

        if (form.cleaned_data['happeningNow'] == "Hide Finished"):
            request.session["HappeningNow"] = False # may be reversed.
        else:
            request.session["HappeningNow"] = True
        

        filters = {
            "startDate": str(form.cleaned_data['startDate']),
            "endDate": str(form.cleaned_data['endDate']),

            "creationDate":str(datetime.date.today()), # keep track of creation
        }
        request.session["DateRangeForm"] = filters
    return get_map_markers(request)

@login_required
@_known_user_check
def update_sort(request, sortMethod):
    request.session["SortMethod"] = sortMethod
    return get_map_markers(request)


@login_required
@_known_user_check
def update_toggle_show(request):
    if ("HappeningNow" in request.session):
        request.session["HappeningNow"] = not bool(request.session["HappeningNow"])
    else:
        request.session["HappeningNow"] = True
    return get_map_markers(request)


@login_required
@_known_user_check
def get_image_by_event(request, id):
    item = get_object_or_404(Event, id=id)

    pic = item.images.all().last()
    # print('Picture #{} fetched from db: {} (type={})'.format(id, pic.image, type(pic.image)))

    # Maybe we don't need this check as form validation requires a picture be uploaded.
    # But someone could have delete the picture leaving the DB with a bad references.
    if not pic:
        raise Http404

    return HttpResponse(pic.image, content_type=pic.content_type)



@login_required
@_known_user_check
def get_image_by_id(request, id):
    item = get_object_or_404(EventImage, id=id)
    if not item.image:
        raise Http404

    return HttpResponse(item.image, content_type=item.content_type)


# Put this into a helper function. 
def _getComments(request, event_id):
    comments_data = []
    
    
    
    for model_item in Comment.objects.all():
        # Only build and append to comments if it's for the event we want
        if model_item.event.id == event_id:
            my_item = {
                'user': model_item.user,
                'id': model_item.id,
                'create_date': date_format(model_item.create_date, "n/j/Y g:i A"),
                'event_id': model_item.event.id,
                'content': model_item.content,
                'user_id': request.user.id,
                'picture': model_item.user.profile.picture,
            }
            comments_data.append(my_item)

    response_data = {
        'comments': comments_data,
    }
    return response_data


# This function will add comments using AJAX
@login_required
@_known_user_check
def add_comment(request, event_id):
    # May be redundant, included anyways for good measure
    if not request.user.id:
        return _my_json_error_response("You must be logged in to do the operation", status=401)
    
    if request.method != "POST":
        return _my_json_error_response("You must use a POST request to do this operation", status=405)
    
    if 'content' not in request.POST or not request.POST['content'] or len(request.POST['content']) == 0:
        return _my_json_error_response("Missing a parameter", status=400)
    
    if 'csrfmiddlewaretoken' not in request.POST or not request.POST['csrfmiddlewaretoken']:
        return _my_json_error_response("Missing a parameter", status=400)

    if event_id > len(Event.objects.all()):
        return _my_json_error_response("Event id is too large", status=400)
    
    item_event = Event.objects.get(id=event_id)

    Comment.objects.create(content=request.POST['content'], 
                    user=User.objects.get(id=request.user.id), 
                    create_date=timezone.now(),
                    event=item_event)
    
    item_event.num_comments += 1
    item_event.save()

    response_json = json.dumps(_getComments(request, event_id), default=str)

    return HttpResponse(response_json, content_type='application/json')


def get_comment(request, event_id):
    if not request.user.id:
        return _my_json_error_response("You must be logged in to do this operation", status=401)

    if request.method != 'GET':
        return _my_json_error_response("You must use a GET request for this operation", status=405)

    response_json = json.dumps(_getComments(request, event_id), default=str)
    return HttpResponse(response_json, content_type='application/json')



# This function is a rudimentary JSON checker
@login_required
@_known_user_check
def _my_json_error_response(message, status=200):
    response_json = '{ "error": "' + message + '" }'
    return HttpResponse(response_json, content_type='application/json', status=status)    