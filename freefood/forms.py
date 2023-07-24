from django import forms
from django.forms import Textarea, DateInput, TimeInput, SelectMultiple
 
from freefood.models import Event

MAX_UPLOAD_SIZE = 2500000
 
class EventForm(forms.ModelForm):
    class Meta:
        model = Event
        fields = ['name_of_event', 'food', 'veg', 'vn', 'df', 'gf', 'date', 'start_time', 'end_time', 
                  'link', 'notes', 'location_lat', 'location_lng', 
                  'building_name', 'room_number']
       
        widgets = {
            "notes" : Textarea(attrs={'cols': 60, 'rows': 3}),
            # 'image': forms.FileInput(attrs={'id':'id_food_image'}),
            "location_lat": forms.HiddenInput(),
            "location_lng": forms.HiddenInput(),
        }
    address = forms.CharField(required=True)
    image = forms.FileField(required=False)

    def clean_image(self):
        picture = self.cleaned_data['image']
        if not picture or not hasattr(picture, 'content_type'):
            return None         # it should probably be ok to *not* submit a picture. 
        if not picture.content_type or not picture.content_type.startswith('image'):
            raise forms.ValidationError('File type is not image')
        if picture.size > MAX_UPLOAD_SIZE:
            raise forms.ValidationError('File too big (max size is {0} bytes)'.format(MAX_UPLOAD_SIZE))
        return picture


class DateRangeForm(forms.Form):
    startDate = forms.DateField(required=False)
    endDate = forms.DateField(required=False)

class RestrictionsForm(forms.ModelForm):
    class Meta:
        model = Event
        fields = ['veg', 'vn', 'df', 'gf']
    
class AllFiltersForm(forms.ModelForm):
    class Meta:
        model = Event
        fields = ['veg', 'vn', 'df', 'gf']

    sort = forms.CharField()
    startDate = forms.DateField(required=False)
    endDate = forms.DateField(required=False)
    happeningNow = forms.CharField()


class UploadImageForm(forms.Form):
    image = forms.FileField(required=True)

    def clean_image(self):
        picture = self.cleaned_data['image']
        if not picture or not hasattr(picture, 'content_type'):
            raise forms.ValidationError('Please actually include an image. ')
        if not picture.content_type or not picture.content_type.startswith('image'):
            raise forms.ValidationError('File type is not image')
        if picture.size > MAX_UPLOAD_SIZE:
            raise forms.ValidationError('File too big (max size is {0} bytes)'.format(MAX_UPLOAD_SIZE))
        return picture