# Generated manually for patient name structure changes

from django.db import migrations, models


def split_existing_names(apps, schema_editor):
    """Split existing full names into first_name and last_name"""
    Patient = apps.get_model('patients', 'Patient')
    
    for patient in Patient.objects.all():
        if patient.name:
            name_parts = patient.name.strip().split()
            if len(name_parts) >= 2:
                patient.first_name = name_parts[0]
                patient.last_name = name_parts[-1]
                # Handle middle initials and suffixes
                if len(name_parts) > 2:
                    # Check if last part is a suffix
                    suffixes = ['Jr.', 'Sr.', 'III', 'II', 'IV', 'Jr', 'Sr']
                    if name_parts[-1] in suffixes:
                        patient.suffix = name_parts[-1]
                        if len(name_parts) > 3:
                            patient.last_name = name_parts[-2]
                            # Middle initial(s)
                            middle_parts = name_parts[1:-2]
                            if middle_parts:
                                patient.middle_initial = middle_parts[0][:5]  # Limit to 5 chars
                        else:
                            patient.last_name = name_parts[-2]
                    else:
                        # Middle initial(s)
                        middle_parts = name_parts[1:-1]
                        if middle_parts:
                            patient.middle_initial = middle_parts[0][:5]  # Limit to 5 chars
            elif len(name_parts) == 1:
                patient.first_name = name_parts[0]
                patient.last_name = ""
            
            patient.save()


def reverse_split_names(apps, schema_editor):
    """Reverse the operation by reconstructing full names"""
    Patient = apps.get_model('patients', 'Patient')
    
    for patient in Patient.objects.all():
        name_parts = []
        if patient.first_name:
            name_parts.append(patient.first_name)
        if patient.middle_initial:
            initial = patient.middle_initial
            if not initial.endswith('.'):
                initial += '.'
            name_parts.append(initial)
        if patient.last_name:
            name_parts.append(patient.last_name)
        if patient.suffix:
            name_parts.append(patient.suffix)
        
        patient.name = ' '.join(name_parts)
        patient.save()


class Migration(migrations.Migration):

    dependencies = [
        ('patients', '0011_alter_patient_address_alter_patient_gender_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='patient',
            name='first_name',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='patient',
            name='last_name',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='patient',
            name='middle_initial',
            field=models.CharField(blank=True, max_length=5, null=True),
        ),
        migrations.AddField(
            model_name='patient',
            name='suffix',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.RunPython(split_existing_names, reverse_split_names),
    ]
