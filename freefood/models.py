# Create your models here.
from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist

class Event(models.Model):
    # each event has one user who made it, copied from Post model (hw5)

    # Metadata:
    create_date     = models.DateTimeField(auto_now_add=True)
    rating          = models.FloatField(default=0)
    rating_num      = models.IntegerField(default=0)

    num_views       = models.IntegerField(default=0)
    available       = models.BooleanField(default=True)

    
    user            = models.ForeignKey(User, default=None, on_delete=models.PROTECT)

    # comments
    num_comments    = models.IntegerField(default=0) # would like to keep track 
                                                     # of this for sorting. 

    name_of_event   = models.CharField(max_length=100)
    food            = models.CharField(max_length=100)

    veg             = models.BooleanField(default=False)
    vn              = models.BooleanField(default=False)
    df              = models.BooleanField(default=False)
    gf              = models.BooleanField(default=False)

    date            = models.DateField() # datetime.date (year, month, day)
    start_time      = models.TimeField(null=True)
    end_time        = models.TimeField(null=True, blank=True)
    link            = models.CharField(max_length=500, null=True, blank=True)
    notes           = models.CharField(max_length=500, null=True, blank=True)
    
    location_lat    = models.FloatField()
    location_lng    = models.FloatField()

    building_name   = models.CharField(max_length=500)
    room_number     = models.CharField(max_length=500)


# These store the images. 
class EventImage(models.Model):
    image        = models.FileField()
    content_type = models.CharField(max_length=50)

    event        = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="images")


class Rating(models.Model):
    # Event for the comment
    event       = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="ratings")

    # Who made comment, when was comment made, etc. 
    user        = models.ForeignKey(User, on_delete=models.CASCADE, related_name="user_ratings")

    # 1 <= value <= 5
    value       = models.IntegerField()


class Comment(models.Model):
    # Event for the comment
    event       = models.ForeignKey(Event, default=None, on_delete=models.CASCADE, related_name="comments")

    # Who made comment, when was comment made, etc. 
    user        = models.ForeignKey(User, on_delete=models.PROTECT)
    create_date = models.DateTimeField(auto_now_add=True)

    # what does the comment actually contain?
    content     = models.CharField(max_length=500)

    # replies to comment (optional? just putting it here for now)
    replies     = models.ForeignKey('self', on_delete=models.CASCADE, null=True)


# This entire model is optional, but would potentially be an interesting addition.
class Like(models.Model):
    # who liked the comment?
    user        = models.ForeignKey(User, on_delete=models.CASCADE)

    # likes are for comments
    comment     = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name="likes")

    # value
    like        = models.IntegerField(default=0)


# Profile model 
class Profile(models.Model):
    user            = models.OneToOneField(User, on_delete=models.PROTECT, related_name="profile")
    events          = models.ManyToManyField(Event, related_name="events")
    picture          = models.FileField()
    content_type    = models.CharField(max_length=50)