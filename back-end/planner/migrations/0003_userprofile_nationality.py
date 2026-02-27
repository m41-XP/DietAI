from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('planner', '0002_alter_mealplan_options_foodlog_is_from_plan_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='nationality',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
    ]
